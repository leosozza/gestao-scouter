/**
 * Edge Function: Teste de Conexão com TabuladorMax
 * Diagnóstico para verificar credenciais e estrutura da tabela
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {},
    connection: {},
    tables: {},
    leads_sample: null,
    errors: []
  };

  try {
    console.log('🔍 [Test] Iniciando diagnóstico de conexão...');
    
    // 1. Verificar variáveis de ambiente
    diagnostics.environment = {
      TABULADOR_URL: Deno.env.get('TABULADOR_URL') ? '✅ Configurado' : '❌ Não configurado',
      TABULADOR_SERVICE_KEY: Deno.env.get('TABULADOR_SERVICE_KEY') ? '✅ Configurado' : '❌ Não configurado',
      url_value: Deno.env.get('TABULADOR_URL') || 'VAZIO'
    };

    console.log('📋 [Test] Variáveis de ambiente:', diagnostics.environment);

    // 2. Testar conexão
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    if (!tabuladorUrl || !tabuladorKey) {
      throw new Error('Credenciais do TabuladorMax não configuradas');
    }

    console.log('🔌 [Test] Conectando ao TabuladorMax:', tabuladorUrl);
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });
    diagnostics.connection = { status: '✅ Cliente criado' };

    // 3. Testar query na tabela leads
    console.log('📥 [Test] Testando query na tabela leads...');
    console.log('📡 [Test] Endpoint:', `${tabuladorUrl}/rest/v1/leads`);
    
    const { data: leadsData, error: leadsError, count } = await tabulador
      .from('leads')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (leadsError) {
      console.error('❌ [Test] Erro ao acessar tabela leads:', {
        message: leadsError.message,
        code: leadsError.code,
        details: leadsError.details,
        hint: leadsError.hint,
      });
      
      diagnostics.tables = {
        leads: {
          status: '❌ Erro ao acessar',
          error: leadsError.message,
          code: leadsError.code,
          details: leadsError.details,
          hint: leadsError.hint,
          troubleshooting: get406Troubleshooting(leadsError),
        }
      };
    } else {
      console.log('✅ [Test] Tabela leads acessível:', {
        total: count,
        sample: leadsData?.length || 0,
      });
      
      diagnostics.tables = {
        leads: {
          status: '✅ Acessível',
          total_count: count,
          sample_count: leadsData?.length || 0,
        }
      };
      diagnostics.leads_sample = leadsData;
    }

    // 4. Listar todas as tabelas disponíveis (via schema)
    console.log('📋 [Test] Listando tabelas disponíveis...');
    try {
      const { data: tablesData, error: tablesError } = await tabulador
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (tablesError) {
        console.warn('⚠️ [Test] Não foi possível listar tabelas:', tablesError.message);
        (diagnostics.tables as Record<string, unknown>).available = {
          status: '⚠️ Erro ao listar',
          error: tablesError.message
        };
      } else {
        const tableNames = tablesData?.map(t => t.table_name) || [];
        console.log('✅ [Test] Tabelas disponíveis:', tableNames);
        (diagnostics.tables as Record<string, unknown>).available = tableNames;
      }
    } catch (err) {
      console.warn('⚠️ [Test] Exceção ao listar tabelas:', err);
    }

    // 5. Testar outras possíveis tabelas
    const possibleTables = ['Leads', 'lead', 'Lead', 'fichas', 'Fichas'];
    const tests: Record<string, unknown> = {};

    for (const tableName of possibleTables) {
      try {
        const { error, count } = await tabulador
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        tests[tableName] = {
          exists: !error,
          count: count || 0,
          error: error?.message || null
        };
      } catch (err) {
        tests[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido'
        };
      }
    }
    
    (diagnostics.tables as Record<string, unknown>).tests = tests;

    const executionTime = Date.now() - startTime;
    diagnostics.execution_time_ms = executionTime;
    
    console.log('✅ [Test] Diagnóstico completo em', executionTime, 'ms');
    console.log('📊 [Test] Resultado:', JSON.stringify(diagnostics, null, 2));

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ [Test] Erro no diagnóstico:', message);
    
    (diagnostics.errors as string[]).push(message);
    diagnostics.execution_time_ms = Date.now() - startTime;

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function get406Troubleshooting(error: { code?: string; message?: string }): string {
  if (error.code === '406' || error.message?.includes('406')) {
    return 'Erro 406: Provavelmente falta o header "Prefer: return=representation" ou há problema com o Content-Type. Verifique as configurações de CORS e headers no Supabase.';
  }
  if (error.code === 'PGRST116') {
    return 'Tabela não encontrada. Verifique se a tabela "leads" existe no projeto TabuladorMax.';
  }
  if (error.code === '42501') {
    return 'Permissão negada. Verifique se a service role key tem permissão para acessar a tabela.';
  }
  return 'Verifique os logs do Supabase para mais detalhes.';
}
