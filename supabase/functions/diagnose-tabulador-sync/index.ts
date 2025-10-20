/**
 * Edge Function: Diagnóstico Completo de Sincronização TabuladorMax
 * ===================================================================
 * 
 * Esta função executa um diagnóstico completo da configuração e conexão
 * com TabuladorMax, identificando problemas comuns e fornecendo soluções.
 * 
 * Testes realizados:
 * 1. Validação de variáveis de ambiente
 * 2. Teste de conectividade de rede
 * 3. Validação de credenciais
 * 4. Listagem e teste de tabelas disponíveis
 * 5. Verificação de permissões RLS
 * 6. Teste de leitura de dados
 * 7. Análise de estrutura de dados
 * 
 * Deploy:
 * supabase functions deploy diagnose-tabulador-sync
 * 
 * Uso:
 * POST https://your-project.supabase.co/functions/v1/diagnose-tabulador-sync
 */

import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

interface DiagnosticResult {
  timestamp: string;
  overall_status: 'ok' | 'warning' | 'error';
  tests: {
    environment: TestResult;
    connectivity: TestResult;
    authentication: TestResult;
    tables: TestResult;
    permissions: TestResult;
    data_structure: TestResult;
  };
  recommendations: string[];
  errors: string[];
}

interface TestResult {
  status: 'ok' | 'warning' | 'error' | 'skipped';
  message: string;
  details?: any;
  duration_ms?: number;
}

/**
 * Testa variáveis de ambiente
 */
async function testEnvironment(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    const missing: string[] = [];
    if (!tabuladorUrl) missing.push('TABULADOR_URL');
    if (!tabuladorKey) missing.push('TABULADOR_SERVICE_KEY');
    
    if (missing.length > 0) {
      return {
        status: 'error',
        message: `Variáveis de ambiente faltando: ${missing.join(', ')}`,
        details: {
          TABULADOR_URL: tabuladorUrl ? '✅ Configurada' : '❌ Faltando',
          TABULADOR_SERVICE_KEY: tabuladorKey ? '✅ Configurada' : '❌ Faltando',
          instructions: 'Configure no Supabase Dashboard → Project Settings → Edge Functions → Secrets'
        },
        duration_ms: Date.now() - start
      };
    }
    
    // Validate URL format
    let urlValid = false;
    let urlError = '';
    try {
      const urlObj = new URL(tabuladorUrl);
      urlValid = true;
    } catch (e) {
      urlError = e instanceof Error ? e.message : 'URL inválida';
    }
    
    if (!urlValid) {
      return {
        status: 'error',
        message: 'TABULADOR_URL inválida',
        details: {
          url: tabuladorUrl,
          error: urlError,
          expected_format: 'https://your-project.supabase.co'
        },
        duration_ms: Date.now() - start
      };
    }
    
    return {
      status: 'ok',
      message: 'Variáveis de ambiente configuradas corretamente',
      details: {
        url: tabuladorUrl,
        key_configured: true,
        url_valid: true
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao testar ambiente',
      duration_ms: Date.now() - start
    };
  }
}

/**
 * Testa conectividade com TabuladorMax
 */
async function testConnectivity(tabuladorUrl: string, tabuladorKey: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('🔌 [Diagnostic] Testando conectividade...');
    
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });
    
    // Try a simple RPC call or schema query
    const { data, error } = await tabulador.rpc('list_public_tables').limit(1);
    
    if (error && error.code !== 'PGRST202') { // PGRST202 = function not found (that's ok)
      // Try alternative: query information_schema
      const { error: schemaError } = await tabulador
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(1);
      
      if (schemaError) {
        return {
          status: 'error',
          message: 'Falha ao conectar com TabuladorMax',
          details: {
            url: tabuladorUrl,
            error: schemaError.message,
            error_code: schemaError.code,
            hint: 'Verifique se a URL está correta e o projeto está ativo'
          },
          duration_ms: Date.now() - start
        };
      }
    }
    
    return {
      status: 'ok',
      message: 'Conectividade estabelecida com sucesso',
      details: {
        url: tabuladorUrl,
        latency_ms: Date.now() - start
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro de conectividade',
      details: {
        url: tabuladorUrl,
        suggestion: 'Verifique se o projeto TabuladorMax está ativo e a URL está correta'
      },
      duration_ms: Date.now() - start
    };
  }
}

/**
 * Testa autenticação e credenciais
 */
async function testAuthentication(tabuladorUrl: string, tabuladorKey: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('🔐 [Diagnostic] Testando autenticação...');
    
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });
    
    // Try to access a protected resource
    const { error } = await tabulador
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      if (error.code === '42501') {
        return {
          status: 'error',
          message: 'Permissão negada - verifique as credenciais',
          details: {
            error_code: error.code,
            message: error.message,
            suggestion: 'Use a SERVICE ROLE KEY, não a anon/publishable key',
            where_to_find: 'Supabase Dashboard → Project Settings → API → service_role key (secret)'
          },
          duration_ms: Date.now() - start
        };
      }
      
      if (error.code === 'PGRST116' || error.code === 'PGRST301') {
        // Table not found is OK for auth test - means auth worked
        return {
          status: 'ok',
          message: 'Autenticação bem-sucedida',
          details: {
            note: 'Credenciais válidas (tabela "leads" pode não existir, mas auth funcionou)',
            error_was: error.message
          },
          duration_ms: Date.now() - start
        };
      }
      
      return {
        status: 'warning',
        message: 'Autenticação funcionou mas houve erro no acesso',
        details: {
          error_code: error.code,
          error_message: error.message,
          note: 'As credenciais parecem válidas mas há outro problema'
        },
        duration_ms: Date.now() - start
      };
    }
    
    return {
      status: 'ok',
      message: 'Autenticação bem-sucedida',
      details: {
        authenticated: true,
        table_accessible: true
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro de autenticação',
      duration_ms: Date.now() - start
    };
  }
}

/**
 * Lista e testa tabelas disponíveis
 */
async function testTables(tabuladorUrl: string, tabuladorKey: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('📊 [Diagnostic] Testando tabelas...');
    
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });
    
    const tableTests: any[] = [];
    const tableVariations = ['leads', 'Leads', '"Leads"', '"leads"', 'LEADS', 'lead', 'Lead'];
    
    for (const tableName of tableVariations) {
      const testStart = Date.now();
      const { count, error } = await tabulador
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1);
      
      tableTests.push({
        table_name: tableName,
        exists: !error,
        count: count || 0,
        error: error?.message,
        error_code: error?.code,
        duration_ms: Date.now() - testStart
      });
    }
    
    const accessibleTables = tableTests.filter(t => t.exists);
    const tablesWithData = accessibleTables.filter(t => t.count > 0);
    
    if (tablesWithData.length === 0) {
      return {
        status: 'error',
        message: 'Nenhuma tabela com dados encontrada',
        details: {
          tables_tested: tableTests,
          accessible_count: accessibleTables.length,
          with_data_count: 0,
          recommendations: [
            '1. Verifique se a tabela "leads" existe no TabuladorMax',
            '2. Verifique se há dados na tabela',
            '3. Verifique as políticas RLS',
            '4. Use o SQL Editor para testar: SELECT COUNT(*) FROM leads;'
          ]
        },
        duration_ms: Date.now() - start
      };
    }
    
    const bestTable = tablesWithData.reduce((best, curr) => 
      curr.count > best.count ? curr : best
    );
    
    return {
      status: 'ok',
      message: `${tablesWithData.length} tabela(s) encontrada(s) com dados`,
      details: {
        tables_tested: tableTests,
        accessible_count: accessibleTables.length,
        with_data_count: tablesWithData.length,
        best_table: bestTable,
        recommendation: `Use a tabela "${bestTable.table_name}" para sincronização (${bestTable.count} registros)`
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao testar tabelas',
      duration_ms: Date.now() - start
    };
  }
}

/**
 * Verifica permissões RLS
 */
async function testPermissions(tabuladorUrl: string, tabuladorKey: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('🔒 [Diagnostic] Testando permissões...');
    
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });
    
    // Try to read data
    const { data: readData, error: readError } = await tabulador
      .from('leads')
      .select('*')
      .limit(5);
    
    const canRead = !readError;
    
    return {
      status: canRead ? 'ok' : 'error',
      message: canRead ? 'Permissões de leitura OK' : 'Sem permissão de leitura',
      details: {
        can_read: canRead,
        read_error: readError?.message,
        read_error_code: readError?.code,
        records_fetched: readData?.length || 0,
        notes: [
          'SERVICE ROLE KEY deve ter acesso completo, ignorando RLS',
          'Se usando anon key, verifique políticas RLS da tabela',
          'Política necessária: SELECT para role anon ou service_role'
        ]
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao testar permissões',
      duration_ms: Date.now() - start
    };
  }
}

/**
 * Analisa estrutura dos dados
 */
async function testDataStructure(tabuladorUrl: string, tabuladorKey: string): Promise<TestResult> {
  const start = Date.now();
  
  try {
    console.log('🔍 [Diagnostic] Analisando estrutura de dados...');
    
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });
    
    // Fetch sample data
    const { data, error } = await tabulador
      .from('leads')
      .select('*')
      .limit(3);
    
    if (error) {
      return {
        status: 'warning',
        message: 'Não foi possível analisar estrutura',
        details: {
          error: error.message,
          note: 'Testes anteriores podem ter identificado o problema'
        },
        duration_ms: Date.now() - start
      };
    }
    
    if (!data || data.length === 0) {
      return {
        status: 'warning',
        message: 'Tabela vazia - não há dados para analisar',
        duration_ms: Date.now() - start
      };
    }
    
    // Analyze structure
    const sampleRecord = data[0];
    const fields = Object.keys(sampleRecord);
    const requiredFields = ['id', 'nome', 'telefone', 'criado'];
    const missingFields = requiredFields.filter(f => !fields.includes(f));
    const hasUpdatedAt = fields.includes('updated_at') || fields.includes('modificado');
    
    return {
      status: missingFields.length > 0 ? 'warning' : 'ok',
      message: missingFields.length > 0 
        ? `Estrutura parcial - faltam campos: ${missingFields.join(', ')}`
        : 'Estrutura de dados compatível',
      details: {
        total_fields: fields.length,
        fields: fields,
        sample_record: sampleRecord,
        required_fields_present: requiredFields.filter(f => fields.includes(f)),
        missing_fields: missingFields,
        has_updated_at: hasUpdatedAt,
        recommendations: missingFields.length > 0 
          ? ['Verifique se a tabela tem todos os campos necessários', 'Alguns campos podem estar com nomes diferentes']
          : ['Estrutura OK para sincronização']
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro ao analisar estrutura',
      duration_ms: Date.now() - start
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    overall_status: 'ok',
    tests: {
      environment: { status: 'skipped', message: 'Não executado' },
      connectivity: { status: 'skipped', message: 'Não executado' },
      authentication: { status: 'skipped', message: 'Não executado' },
      tables: { status: 'skipped', message: 'Não executado' },
      permissions: { status: 'skipped', message: 'Não executado' },
      data_structure: { status: 'skipped', message: 'Não executado' },
    },
    recommendations: [],
    errors: []
  };

  try {
    console.log('🚀 [Diagnostic] Iniciando diagnóstico completo...');
    
    // Test 1: Environment
    result.tests.environment = await testEnvironment();
    if (result.tests.environment.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Variáveis de ambiente não configuradas corretamente');
      result.recommendations.push('Configure TABULADOR_URL e TABULADOR_SERVICE_KEY no Supabase Dashboard');
      
      return new Response(JSON.stringify(result, null, 2), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const tabuladorUrl = Deno.env.get('TABULADOR_URL')!;
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY')!;
    
    // Test 2: Connectivity
    result.tests.connectivity = await testConnectivity(tabuladorUrl, tabuladorKey);
    if (result.tests.connectivity.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Falha na conectividade com TabuladorMax');
      result.recommendations.push('Verifique se a URL está correta e o projeto está ativo');
    }
    
    // Test 3: Authentication
    result.tests.authentication = await testAuthentication(tabuladorUrl, tabuladorKey);
    if (result.tests.authentication.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Falha na autenticação - credenciais inválidas');
      result.recommendations.push('Use a SERVICE ROLE KEY do projeto TabuladorMax');
    }
    
    // Test 4: Tables
    result.tests.tables = await testTables(tabuladorUrl, tabuladorKey);
    if (result.tests.tables.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Nenhuma tabela de leads encontrada com dados');
      result.recommendations.push('Verifique se a tabela "leads" existe no TabuladorMax');
    }
    
    // Test 5: Permissions
    result.tests.permissions = await testPermissions(tabuladorUrl, tabuladorKey);
    if (result.tests.permissions.status === 'error') {
      if (result.overall_status !== 'error') {
        result.overall_status = 'warning';
      }
      result.errors.push('Problemas de permissão detectados');
      result.recommendations.push('Verifique as políticas RLS da tabela leads');
    }
    
    // Test 6: Data Structure
    result.tests.data_structure = await testDataStructure(tabuladorUrl, tabuladorKey);
    if (result.tests.data_structure.status === 'warning') {
      if (result.overall_status === 'ok') {
        result.overall_status = 'warning';
      }
      result.recommendations.push('Alguns campos esperados podem estar faltando na tabela');
    }
    
    // Overall recommendations
    if (result.overall_status === 'ok') {
      result.recommendations.push('✅ Todos os testes passaram! A sincronização deve funcionar corretamente.');
      result.recommendations.push('Execute initial-sync-leads para fazer a migração inicial dos dados.');
    } else if (result.overall_status === 'warning') {
      result.recommendations.push('⚠️ Alguns avisos foram encontrados, mas a sincronização pode funcionar.');
      result.recommendations.push('Revise os detalhes dos testes para possíveis melhorias.');
    } else {
      result.recommendations.push('❌ Problemas críticos detectados. Resolva os erros antes de tentar sincronizar.');
      result.recommendations.push('Consulte a documentação: TABULADORMAX_CONFIGURATION_GUIDE.md');
    }
    
    console.log('✅ [Diagnostic] Diagnóstico completo!');
    
    return new Response(JSON.stringify(result, null, 2), {
      status: result.overall_status === 'error' ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ [Diagnostic] Erro fatal:', message);
    
    result.overall_status = 'error';
    result.errors.push(`Erro fatal: ${message}`);
    
    return new Response(JSON.stringify(result, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
