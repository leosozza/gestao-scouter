/**
 * Edge Function: Teste de Conexão com TabuladorMax
 * 
 * Diagnóstico para verificar credenciais e estrutura da tabela com:
 * - Retry logic para conexões instáveis
 * - Logging estruturado em JSON
 * - Métricas de latência e performance
 * - Sugestões detalhadas para resolução de problemas
 * - Notificações Bitrix opcionais
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  LogLevel,
  logMessage,
  generateTraceId,
  createErrorResponse,
  jsonResponse,
  handleCorsPreFlight,
  extractSupabaseError,
  PerformanceTimer,
  validateEnvVars,
  retryWithBackoff,
  sendBitrixNotification,
} from '../_shared/sync-utils.ts';

serve(async (req) => {
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  const functionName = 'test-tabulador-connection';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  // Log request start
  logMessage(LogLevel.INFO, functionName, 'Connection test started', {
    method: req.method,
    trace_id: traceId,
  });

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    environment: {},
    connection: {},
    tables: {},
    leads_sample: null,
    errors: [],
    suggestions: [],
  };

  try {
    timer.mark('test_start');
    
    // 1. Validate environment variables
    timer.mark('env_check_start');
    const envValidation = validateEnvVars(['TABULADOR_URL', 'TABULADOR_SERVICE_KEY']);
    timer.mark('env_check_end');

    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    diagnostics.environment = {
      TABULADOR_URL: tabuladorUrl ? '✅ Configured' : '❌ Not configured',
      TABULADOR_SERVICE_KEY: tabuladorKey ? '✅ Configured' : '❌ Not configured',
      url_value: tabuladorUrl || 'EMPTY',
      url_valid: false,
      validation_duration_ms: timer.getDurationBetween('env_check_start', 'env_check_end'),
    };

    // Validate URL format
    if (tabuladorUrl) {
      try {
        const urlObj = new URL(tabuladorUrl);
        const env = diagnostics.environment as Record<string, unknown>;
        env.url_valid = true;
        env.url_protocol = urlObj.protocol;
        env.url_hostname = urlObj.hostname;
        
        logMessage(LogLevel.INFO, functionName, 'Environment variables validated', {
          url: urlObj.hostname,
          trace_id: traceId,
        });
      } catch (urlError) {
        const env = diagnostics.environment as Record<string, unknown>;
        env.url_valid = false;
        env.url_error = 'Invalid URL - must be format: https://project.supabase.co';
        (diagnostics.errors as string[]).push(`Invalid URL: ${tabuladorUrl}`);
        (diagnostics.suggestions as string[]).push('Verify TABULADOR_URL format is correct');
        
        logMessage(LogLevel.ERROR, functionName, 'Invalid TABULADOR_URL format', {
          url: tabuladorUrl,
          trace_id: traceId,
        });
      }
    }

    // 2. Check if credentials are configured
    if (!envValidation.valid) {
      logMessage(LogLevel.ERROR, functionName, 'Missing required environment variables', {
        missing: envValidation.missing,
        trace_id: traceId,
      });

      (diagnostics.suggestions as string[]).push(
        'Configure missing environment variables in Supabase Dashboard',
        'Go to: Project Settings → Edge Functions → Secrets',
        `Missing: ${envValidation.missing.join(', ')}`
      );
      
      throw new Error(`TabuladorMax credentials not configured. Missing: ${envValidation.missing.join(', ')}`);
    }

    // 3. Create client with retry logic
    timer.mark('client_creation_start');
    
    logMessage(LogLevel.INFO, functionName, 'Creating TabuladorMax client', {
      url: tabuladorUrl,
      trace_id: traceId,
    });

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
    
    timer.mark('client_creation_end');
    diagnostics.connection = {
      status: '✅ Client created',
      duration_ms: timer.getDurationBetween('client_creation_start', 'client_creation_end'),
    };

    // 4. Test table access via Edge Function
    timer.mark('table_test_start');
    
    logMessage(LogLevel.INFO, functionName, 'Testing table access via TabuladorMax Edge Function', {
      trace_id: traceId,
    });
    
    const tableTests: Record<string, any> = {};
    
    try {
      // Chamar Edge Function get-leads-count do TabuladorMax
      const response = await fetch(
        `${tabuladorUrl}/functions/v1/get-leads-count`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tabuladorKey}`,
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        tableTests['leads'] = {
          status: '❌ Edge Function Error',
          error: `HTTP ${response.status}: ${errorText}`,
          hint: 'Verifique se a Edge Function "get-leads-count" está deployada no TabuladorMax'
        };
        
        logMessage(LogLevel.ERROR, functionName, 'Edge Function call failed', {
          status: response.status,
          error: errorText,
          trace_id: traceId,
        });
      } else {
        const result = await response.json();
        
        if (result.success) {
          tableTests['leads'] = {
            status: '✅ Accessible',
            total_count: result.total_leads || 0,
            timestamp: result.timestamp
          };
          
          logMessage(LogLevel.INFO, functionName, 'Table access successful via Edge Function', {
            count: result.total_leads,
            trace_id: traceId,
          });
        } else {
          tableTests['leads'] = {
            status: '❌ Error',
            error: result.error || 'Unknown error'
          };
          
          logMessage(LogLevel.ERROR, functionName, 'Edge Function returned error', {
            error: result.error,
            trace_id: traceId,
          });
        }
      }
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      tableTests['leads'] = {
        status: '❌ Exception',
        error: errorMsg,
        hint: 'Verifique conectividade e se a Edge Function está deployada'
      };
      
      logMessage(LogLevel.ERROR, functionName, 'Exception calling Edge Function', {
        error: errorMsg,
        trace_id: traceId,
      });
    }
    
    timer.mark('table_test_end');
    
    const count = tableTests['leads']?.total_count || 0;
    const isSuccess = tableTests['leads']?.status === '✅ Accessible';

    if (!isSuccess) {
      logMessage(LogLevel.ERROR, functionName, 'Failed to access leads table via Edge Function', {
        error: tableTests['leads']?.error || 'Unknown error',
        trace_id: traceId,
      });

      (diagnostics.suggestions as string[]).push(
        'Verify Edge Function "get-leads-count" is deployed in TabuladorMax',
        'Check TabuladorMax project connectivity',
        'Review TabuladorMax Edge Function logs'
      );
    } else {
      logMessage(LogLevel.INFO, functionName, 'Leads table accessible via Edge Function', {
        total: count,
        trace_id: traceId,
      });

      (diagnostics.suggestions as string[]).push(
        `✅ Connection successful! Total leads: ${count}`
      );
    }

    // 5. List all available tables (via schema)
    timer.mark('list_tables_start');
    
    logMessage(LogLevel.INFO, functionName, 'Listing available tables', {
      trace_id: traceId,
    });

    try {
      const { data: tablesData, error: tablesError } = await tabulador
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      timer.mark('list_tables_end');

      if (tablesError) {
        logMessage(LogLevel.WARN, functionName, 'Could not list tables', {
          error: extractSupabaseError(tablesError),
          trace_id: traceId,
        });

        (diagnostics.tables as Record<string, unknown>).available = {
          status: '⚠️ Error listing tables',
          error: tablesError.message
        };
      } else {
        const tableNames = tablesData?.map(t => t.table_name) || [];
        
        logMessage(LogLevel.INFO, functionName, 'Tables listed successfully', {
          count: tableNames.length,
          trace_id: traceId,
        });

        (diagnostics.tables as Record<string, unknown>).available = tableNames;
      }
    } catch (err) {
      logMessage(LogLevel.WARN, functionName, 'Exception while listing tables', {
        error: err instanceof Error ? err.message : 'Unknown error',
        trace_id: traceId,
      });
    }

    // 6. Test other possible tables
    timer.mark('test_other_tables_start');
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
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }
    
    timer.mark('test_other_tables_end');
    (diagnostics.tables as Record<string, unknown>).other_tables_tested = tests;

    const executionTime = timer.getDuration();
    diagnostics.execution_time_ms = executionTime;
    diagnostics.performance_marks = timer.getAllMarks();
    
    logMessage(LogLevel.INFO, functionName, 'Connection test completed successfully', {
      duration_ms: executionTime,
      trace_id: traceId,
      performance_marks: timer.getAllMarks(),
    });

    return jsonResponse(diagnostics, 200);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logMessage(LogLevel.ERROR, functionName, 'Connection test failed', {
      error: errorMessage,
      trace_id: traceId,
      duration_ms: timer.getDuration(),
    });
    
    (diagnostics.errors as string[]).push(errorMessage);
    diagnostics.execution_time_ms = timer.getDuration();
    diagnostics.performance_marks = timer.getAllMarks();

    // Add general troubleshooting suggestions
    if (!(diagnostics.suggestions as string[]).length) {
      (diagnostics.suggestions as string[]).push(
        'Verify environment variables are correctly configured',
        'Check if TabuladorMax project is active and accessible',
        'Review error details and follow specific recommendations',
        'Consult Supabase logs for more information'
      );
    }

    // Send Bitrix notification for critical failures
    const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
    if (enableBitrix) {
      await sendBitrixNotification({
        title: 'TabuladorMax Connection Test Failed',
        message: errorMessage,
        severity: 'error',
        metadata: {
          trace_id: traceId,
          errors: diagnostics.errors,
          suggestions: diagnostics.suggestions,
        },
      });
    }

    return jsonResponse(diagnostics, 500);
  }
});

/**
 * Provides troubleshooting advice based on error type
 */
function getTroubleshootingAdvice(error: { code?: string; message?: string }): string {
  if (error.code === '406' || error.message?.includes('406')) {
    return 'Error 406: Missing "Prefer: return=representation" header or Content-Type issue. Check CORS and header configuration in Supabase.';
  }
  if (error.code === 'PGRST116') {
    return 'Table not found. Verify that "leads" table exists in TabuladorMax project. Use Supabase Dashboard → Table Editor to confirm.';
  }
  if (error.code === '42501') {
    return 'Permission denied. Verify: 1) Using SERVICE ROLE KEY (not anon key), 2) RLS policies on table, 3) Permissions on public schema';
  }
  if (error.code === 'PGRST301') {
    return 'Routing/parsing error. Table may not exist or name is incorrect. Try variations like "leads", "Leads", or "\\"Leads\\""';
  }
  if (error.message?.includes('connect') || error.message?.includes('network')) {
    return 'Network connection error. Verify: 1) URL is correct, 2) TabuladorMax project is active, 3) No firewall issues';
  }
  return 'Check Supabase logs for more details. Access: Dashboard → Logs → Edge Functions';
}
