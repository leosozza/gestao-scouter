/**
 * Edge Function: Teste de Conexão com TabuladorMax
 * Diagnóstico para verificar credenciais e estrutura da tabela
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    connection: {},
    tables: {},
    leads_sample: null,
    errors: []
  };

  try {
    // 1. Verificar variáveis de ambiente
    diagnostics.environment = {
      TABULADOR_URL: Deno.env.get('TABULADOR_URL') ? '✅ Configurado' : '❌ Não configurado',
      TABULADOR_SERVICE_KEY: Deno.env.get('TABULADOR_SERVICE_KEY') ? '✅ Configurado' : '❌ Não configurado',
      url_value: Deno.env.get('TABULADOR_URL') || 'VAZIO'
    };

    // 2. Testar conexão
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    if (!tabuladorUrl || !tabuladorKey) {
      throw new Error('Credenciais do TabuladorMax não configuradas');
    }

    const tabulador = createClient(tabuladorUrl, tabuladorKey);
    diagnostics.connection.status = '✅ Cliente criado';

    // 3. Testar query na tabela leads
    console.log('📥 Testando query na tabela leads...');
    const { data: leadsData, error: leadsError, count } = await tabulador
      .from('leads')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (leadsError) {
      diagnostics.tables.leads = {
        status: '❌ Erro ao acessar',
        error: leadsError.message,
        code: leadsError.code,
        details: leadsError.details,
        hint: leadsError.hint
      };
    } else {
      diagnostics.tables.leads = {
        status: '✅ Acessível',
        total_count: count,
        sample_count: leadsData?.length || 0
      };
      diagnostics.leads_sample = leadsData;
    }

    // 4. Listar todas as tabelas disponíveis (via schema)
    console.log('📋 Listando tabelas disponíveis...');
    const { data: tablesData, error: tablesError } = await tabulador
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      diagnostics.tables.available = {
        status: '❌ Erro ao listar',
        error: tablesError.message
      };
    } else {
      diagnostics.tables.available = tablesData?.map(t => t.table_name) || [];
    }

    // 5. Testar outras possíveis tabelas
    const possibleTables = ['Leads', 'lead', 'Lead', 'fichas', 'Fichas'];
    diagnostics.tables.tests = {};

    for (const tableName of possibleTables) {
      const { data, error, count } = await tabulador
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      diagnostics.tables.tests[tableName] = {
        exists: !error,
        count: count || 0,
        error: error?.message || null
      };
    }

    console.log('✅ Diagnóstico completo:', diagnostics);

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro no diagnóstico:', message);
    
    diagnostics.errors.push(message);

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
