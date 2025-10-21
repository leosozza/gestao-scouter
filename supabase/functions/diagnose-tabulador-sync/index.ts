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
 * Melhorias:
 * - Logging estruturado em JSON para rastreabilidade
 * - Métricas de performance detalhadas
 * - Notificações Bitrix opcionais para problemas críticos
 * - Trace IDs para correlação de logs
 * 
 * Deploy:
 * supabase functions deploy diagnose-tabulador-sync
 * 
 * Uso:
 * POST https://your-project.supabase.co/functions/v1/diagnose-tabulador-sync
 */

import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  LogLevel,
  logMessage,
  generateTraceId,
  jsonResponse,
  handleCorsPreFlight,
  extractSupabaseError,
  PerformanceTimer,
  sendBitrixNotification,
} from '../_shared/sync-utils.ts';

interface DiagnosticResult {
  timestamp: string;
  trace_id: string;
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
  total_duration_ms?: number;
  bitrix_notification_sent?: boolean;
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
async function testEnvironment(traceId: string): Promise<TestResult> {
  const start = Date.now();
  const functionName = 'diagnose-tabulador-sync:testEnvironment';
  
  try {
    logMessage(LogLevel.INFO, functionName, 'Testing environment variables', { trace_id: traceId });

    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    const missing: string[] = [];
    if (!tabuladorUrl) missing.push('TABULADOR_URL');
    if (!tabuladorKey) missing.push('TABULADOR_SERVICE_KEY');
    
    if (missing.length > 0) {
      logMessage(LogLevel.ERROR, functionName, 'Missing environment variables', {
        missing,
        trace_id: traceId,
      });

      return {
        status: 'error',
        message: `Missing environment variables: ${missing.join(', ')}`,
        details: {
          TABULADOR_URL: tabuladorUrl ? '✅ Configured' : '❌ Missing',
          TABULADOR_SERVICE_KEY: tabuladorKey ? '✅ Configured' : '❌ Missing',
          instructions: 'Configure in Supabase Dashboard → Project Settings → Edge Functions → Secrets'
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
      urlError = e instanceof Error ? e.message : 'Invalid URL';
    }
    
    if (!urlValid) {
      logMessage(LogLevel.ERROR, functionName, 'Invalid TABULADOR_URL format', {
        url: tabuladorUrl,
        error: urlError,
        trace_id: traceId,
      });

      return {
        status: 'error',
        message: 'Invalid TABULADOR_URL',
        details: {
          url: tabuladorUrl,
          error: urlError,
          expected_format: 'https://your-project.supabase.co'
        },
        duration_ms: Date.now() - start
      };
    }
    
    logMessage(LogLevel.INFO, functionName, 'Environment variables validated successfully', {
      url: tabuladorUrl,
      trace_id: traceId,
      duration_ms: Date.now() - start,
    });

    return {
      status: 'ok',
      message: 'Environment variables configured correctly',
      details: {
        url: tabuladorUrl,
        key_configured: true,
        url_valid: true
      },
      duration_ms: Date.now() - start
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error testing environment';
    
    logMessage(LogLevel.ERROR, functionName, errorMessage, {
      trace_id: traceId,
    });

    return {
      status: 'error',
      message: errorMessage,
      duration_ms: Date.now() - start
    };
  }
}

/**
 * Testa conectividade com TabuladorMax
 */
async function testConnectivity(tabuladorUrl: string, tabuladorKey: string, traceId: string): Promise<TestResult> {
  const start = Date.now();
  const functionName = 'diagnose-tabulador-sync:testConnectivity';
  
  try {
    logMessage(LogLevel.INFO, functionName, 'Testing connectivity', {
      url: tabuladorUrl,
      trace_id: traceId,
    });
    
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
async function testAuthentication(tabuladorUrl: string, tabuladorKey: string, traceId: string): Promise<TestResult> {
  const start = Date.now();
  const functionName = 'diagnose-tabulador-sync:testAuthentication';
  
  try {
    logMessage(LogLevel.INFO, functionName, 'Testing authentication', {
      url: tabuladorUrl,
      trace_id: traceId,
    });
    
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
async function testTables(tabuladorUrl: string, tabuladorKey: string, traceId: string): Promise<TestResult> {
  const start = Date.now();
  const functionName = 'diagnose-tabulador-sync:testTables';
  
  try {
    logMessage(LogLevel.INFO, functionName, 'Testing tables', {
      trace_id: traceId,
    });
    
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
async function testPermissions(tabuladorUrl: string, tabuladorKey: string, traceId: string): Promise<TestResult> {
  const start = Date.now();
  const functionName = 'diagnose-tabulador-sync:testPermissions';
  
  try {
    logMessage(LogLevel.INFO, functionName, 'Testing permissions', {
      trace_id: traceId,
    });
    
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
async function testDataStructure(tabuladorUrl: string, tabuladorKey: string, traceId: string): Promise<TestResult> {
  const start = Date.now();
  const functionName = 'diagnose-tabulador-sync:testDataStructure';
  
  try {
    logMessage(LogLevel.INFO, functionName, 'Analyzing data structure', {
      trace_id: traceId,
    });
    
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
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  const functionName = 'diagnose-tabulador-sync';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  logMessage(LogLevel.INFO, functionName, 'Starting comprehensive diagnostics', {
    method: req.method,
    trace_id: traceId,
  });

  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    overall_status: 'ok',
    tests: {
      environment: { status: 'skipped', message: 'Not executed' },
      connectivity: { status: 'skipped', message: 'Not executed' },
      authentication: { status: 'skipped', message: 'Not executed' },
      tables: { status: 'skipped', message: 'Not executed' },
      permissions: { status: 'skipped', message: 'Not executed' },
      data_structure: { status: 'skipped', message: 'Not executed' },
    },
    recommendations: [],
    errors: []
  };

  try {
    timer.mark('diagnostics_start');
    
    // Test 1: Environment
    timer.mark('env_test_start');
    result.tests.environment = await testEnvironment(traceId);
    timer.mark('env_test_end');
    if (result.tests.environment.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Environment variables not configured correctly');
      result.recommendations.push('Configure TABULADOR_URL and TABULADOR_SERVICE_KEY in Supabase Dashboard');
      
      result.total_duration_ms = timer.getDuration();
      
      logMessage(LogLevel.ERROR, functionName, 'Diagnostics failed at environment check', {
        trace_id: traceId,
        duration_ms: result.total_duration_ms,
      });

      return jsonResponse(result, 500);
    }
    
    const tabuladorUrl = Deno.env.get('TABULADOR_URL')!;
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY')!;
    
    // Test 2: Connectivity
    timer.mark('connectivity_test_start');
    result.tests.connectivity = await testConnectivity(tabuladorUrl, tabuladorKey, traceId);
    timer.mark('connectivity_test_end');
    
    if (result.tests.connectivity.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Connectivity failure with TabuladorMax');
      result.recommendations.push('Verify URL is correct and project is active');
    }
    
    // Test 3: Authentication
    timer.mark('auth_test_start');
    result.tests.authentication = await testAuthentication(tabuladorUrl, tabuladorKey, traceId);
    timer.mark('auth_test_end');
    
    if (result.tests.authentication.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('Authentication failure - invalid credentials');
      result.recommendations.push('Use SERVICE ROLE KEY from TabuladorMax project');
    }
    
    // Test 4: Tables
    timer.mark('tables_test_start');
    result.tests.tables = await testTables(tabuladorUrl, tabuladorKey, traceId);
    timer.mark('tables_test_end');
    
    if (result.tests.tables.status === 'error') {
      result.overall_status = 'error';
      result.errors.push('No leads table found with data');
      result.recommendations.push('Verify that "leads" table exists in TabuladorMax');
    }
    
    // Test 5: Permissions
    timer.mark('permissions_test_start');
    result.tests.permissions = await testPermissions(tabuladorUrl, tabuladorKey, traceId);
    timer.mark('permissions_test_end');
    
    if (result.tests.permissions.status === 'error') {
      if (result.overall_status !== 'error') {
        result.overall_status = 'warning';
      }
      result.errors.push('Permission problems detected');
      result.recommendations.push('Verify RLS policies on leads table');
    }
    
    // Test 6: Data Structure
    timer.mark('structure_test_start');
    result.tests.data_structure = await testDataStructure(tabuladorUrl, tabuladorKey, traceId);
    timer.mark('structure_test_end');
    
    if (result.tests.data_structure.status === 'warning') {
      if (result.overall_status === 'ok') {
        result.overall_status = 'warning';
      }
      result.recommendations.push('Some expected fields may be missing from table');
    }
    
    timer.mark('diagnostics_end');
    result.total_duration_ms = timer.getDuration();
    
    // Overall recommendations
    if (result.overall_status === 'ok') {
      result.recommendations.push('✅ All tests passed! Synchronization should work correctly.');
      result.recommendations.push('Run initial-sync-leads to perform initial data migration.');
    } else if (result.overall_status === 'warning') {
      result.recommendations.push('⚠️ Some warnings found, but synchronization may work.');
      result.recommendations.push('Review test details for possible improvements.');
    } else {
      result.recommendations.push('❌ Critical problems detected. Resolve errors before attempting sync.');
      result.recommendations.push('Consult documentation: TABULADORMAX_CONFIGURATION_GUIDE.md');
    }
    
    // Send Bitrix notification if there are critical issues
    const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
    if (enableBitrix && result.overall_status === 'error') {
      const notification = await sendBitrixNotification({
        title: 'TabuladorMax Sync Diagnostics Failed',
        message: `Critical issues detected: ${result.errors.join(', ')}`,
        severity: 'error',
        metadata: {
          trace_id: traceId,
          tests: result.tests,
          errors: result.errors,
          recommendations: result.recommendations,
        },
      });
      result.bitrix_notification_sent = notification.success;
    }
    
    logMessage(LogLevel.INFO, functionName, 'Diagnostics completed', {
      overall_status: result.overall_status,
      duration_ms: result.total_duration_ms,
      trace_id: traceId,
      performance_marks: timer.getAllMarks(),
    });
    
    const httpStatus = result.overall_status === 'error' ? 500 : 200;
    return jsonResponse(result, httpStatus);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logMessage(LogLevel.ERROR, functionName, 'Fatal error in diagnostics', {
      error: errorMessage,
      trace_id: traceId,
      duration_ms: timer.getDuration(),
    });
    
    result.overall_status = 'error';
    result.errors.push(`Fatal error: ${errorMessage}`);
    result.total_duration_ms = timer.getDuration();
    
    // Send Bitrix notification for critical failures
    const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
    if (enableBitrix) {
      const notification = await sendBitrixNotification({
        title: 'TabuladorMax Diagnostics Critical Error',
        message: errorMessage,
        severity: 'error',
        metadata: {
          trace_id: traceId,
          error: errorMessage,
        },
      });
      result.bitrix_notification_sent = notification.success;
    }
    
    return jsonResponse(result, 500);
  }
});
