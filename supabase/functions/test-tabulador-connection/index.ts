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
    
    // 1. Verificar variáveis de ambiente com mais detalhes
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    diagnostics.environment = {
      TABULADOR_URL: tabuladorUrl ? '✅ Configurado' : '❌ Não configurado',
      TABULADOR_SERVICE_KEY: tabuladorKey ? '✅ Configurado' : '❌ Não configurado',
      url_value: tabuladorUrl || 'VAZIO',
      url_valid: false
    };

    // Validate URL format
    if (tabuladorUrl) {
      try {
        const urlObj = new URL(tabuladorUrl);
        diagnostics.environment.url_valid = true;
        diagnostics.environment.url_protocol = urlObj.protocol;
        diagnostics.environment.url_hostname = urlObj.hostname;
      } catch (urlError) {
        diagnostics.environment.url_valid = false;
        diagnostics.environment.url_error = 'URL inválida - deve ser formato: https://project.supabase.co';
        (diagnostics.errors as string[]).push(`URL inválida: ${tabuladorUrl}`);
      }
    }

    console.log('📋 [Test] Variáveis de ambiente:', diagnostics.environment);

    // 2. Testar conexão
    if (!tabuladorUrl || !tabuladorKey) {
      const missingVars = [];
      if (!tabuladorUrl) missingVars.push('TABULADOR_URL');
      if (!tabuladorKey) missingVars.push('TABULADOR_SERVICE_KEY');
      
      throw new Error(`Credenciais do TabuladorMax não configuradas. Faltando: ${missingVars.join(', ')}`);
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

    // 3. Testar query na tabela leads (tentar variações)
    console.log('📥 [Test] Testando query na tabela leads...');
    
    const tableVariations = ['leads', '"Leads"', 'Leads', '"leads"', 'lead', '"Lead"', 'Lead'];
    let leadsData = null;
    let leadsError = null;
    let count = 0;
    let successTableName = '';
    let allAttempts: any[] = [];
    
    for (const tableName of tableVariations) {
      console.log(`🔍 [Test] Tentando: ${tableName}`);
      const attemptStart = Date.now();
      const result = await tabulador
        .from(tableName)
        .select('*', { count: 'exact', head: false })
        .limit(5);
      
      const attemptDuration = Date.now() - attemptStart;
      
      allAttempts.push({
        table_name: tableName,
        success: !result.error,
        error: result.error?.message,
        error_code: result.error?.code,
        count: result.count,
        duration_ms: attemptDuration
      });
      
      if (!result.error && result.data) {
        leadsData = result.data;
        count = result.count || 0;
        successTableName = tableName;
        console.log(`✅ [Test] Sucesso com ${tableName}: ${count} registros totais (${attemptDuration}ms)`);
        break;
      } else {
        console.log(`❌ [Test] Falha com ${tableName}: ${result.error?.message} (${result.error?.code})`);
        leadsError = result.error;
      }
    }

    // Store all attempts in diagnostics
    (diagnostics.tables as Record<string, unknown>).attempts = allAttempts;

    if (leadsError && !leadsData) {
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
          table_name_used: successTableName,
          total_count: count,
          sample_count: leadsData?.length || 0,
          recommendation: `Use "${successTableName}" nas configurações de sincronização`
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
    return 'Tabela não encontrada. Verifique se a tabela "leads" existe no projeto TabuladorMax. Use o Supabase Dashboard → Table Editor para confirmar.';
  }
  if (error.code === '42501') {
    return 'Permissão negada. Verifique: 1) Se está usando SERVICE ROLE KEY (não anon key), 2) Políticas RLS da tabela, 3) Permissões no schema public';
  }
  if (error.code === 'PGRST301') {
    return 'Erro de roteamento/parsing. A tabela pode não existir ou o nome está incorreto. Tente variações como "leads", "Leads", ou "\"Leads\""';
  }
  if (error.message?.includes('connect') || error.message?.includes('network')) {
    return 'Erro de conexão de rede. Verifique: 1) URL está correta, 2) Projeto TabuladorMax está ativo, 3) Não há problemas de firewall';
  }
  return 'Verifique os logs do Supabase para mais detalhes. Acesse: Dashboard → Logs → Edge Functions';
}
