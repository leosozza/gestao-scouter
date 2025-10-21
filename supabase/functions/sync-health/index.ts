/**
 * Sync Health Check Edge Function
 * ================================
 * 
 * Monitora a saúde da sincronização entre TabuladorMax e Gestão Scouter.
 * 
 * Funcionalidades:
 * - Testa conectividade com TabuladorMax (leitura)
 * - Atualiza tabela sync_status com heartbeat
 * - Retorna status JSON para monitoramento externo
 * - Envia notificações para Bitrix em caso de problemas (opcional)
 * - Logging estruturado em JSON para debugging
 * 
 * Variáveis de Ambiente (configurar no Supabase Dashboard):
 * - TABULADOR_URL: URL do projeto TabuladorMax
 * - TABULADOR_SERVICE_KEY: Service role key do TabuladorMax
 * - SUPABASE_URL: URL do projeto Gestão Scouter (injetado automaticamente)
 * - SUPABASE_SERVICE_ROLE_KEY: Service key do Gestão (injetado automaticamente)
 * - ENABLE_BITRIX_NOTIFICATIONS: "true" para habilitar notificações Bitrix (opcional)
 * 
 * Deploy:
 * supabase functions deploy sync-health
 * 
 * Invoke:
 * curl -X POST https://ngestyxtopvfeyenyvgt.supabase.co/functions/v1/sync-health \
 *   -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
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
  sendBitrixNotification,
} from '../_shared/sync-utils.ts';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  trace_id?: string;
  checks: {
    tabuladorConnection: {
      status: 'ok' | 'error';
      message: string;
      latencyMs?: number;
      recordCount?: number;
    };
    gestaoConnection: {
      status: 'ok' | 'error';
      message: string;
      latencyMs?: number;
      recordCount?: number;
    };
  };
  error?: string;
  suggestions?: string[];
  bitrix_notification_sent?: boolean;
}

serve(async (req: Request) => {
  const traceId = generateTraceId();
  const timer = new PerformanceTimer();
  const functionName = 'sync-health';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  // Log request start
  logMessage(LogLevel.INFO, functionName, 'Health check started', {
    method: req.method,
    trace_id: traceId,
  });

  // Apenas POST ou GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    logMessage(LogLevel.WARN, functionName, 'Method not allowed', {
      method: req.method,
      trace_id: traceId,
    });

    return jsonResponse(
      createErrorResponse(
        'METHOD_NOT_ALLOWED',
        'Only GET and POST methods are allowed',
        '405',
        { allowed_methods: ['GET', 'POST'] },
        ['Use GET or POST method'],
        traceId
      ),
      405
    );
  }

  const result: HealthCheckResult = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    trace_id: traceId,
    checks: {
      tabuladorConnection: {
        status: 'ok',
        message: 'Not checked'
      },
      gestaoConnection: {
        status: 'ok',
        message: 'Not checked'
      }
    }
  };

  try {
    // Validate environment variables
    timer.mark('env_check_start');
    const envValidation = validateEnvVars([
      'TABULADOR_URL',
      'TABULADOR_SERVICE_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ]);
    timer.mark('env_check_end');

    if (!envValidation.valid) {
      logMessage(LogLevel.ERROR, functionName, 'Missing required environment variables', {
        missing: envValidation.missing,
        trace_id: traceId,
      });

      result.status = 'error';
      result.error = 'Missing required environment variables';
      result.suggestions = [
        'Configure missing environment variables in Supabase Dashboard',
        'Go to: Project Settings → Edge Functions → Secrets',
        `Missing: ${envValidation.missing.join(', ')}`,
      ];

      // Send Bitrix notification if enabled
      const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
      if (enableBitrix) {
        await sendBitrixNotification({
          title: 'Sync Health Check Failed',
          message: `Missing environment variables: ${envValidation.missing.join(', ')}`,
          severity: 'error',
          metadata: { trace_id: traceId, missing: envValidation.missing },
        });
        result.bitrix_notification_sent = true;
      }

      return jsonResponse(result, 500);
    }

    // Variáveis de ambiente
    const tabuladorUrl = Deno.env.get('TABULADOR_URL')!;
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY')!;
    const gestaoUrl = Deno.env.get('SUPABASE_URL')!;
    const gestaoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Test TabuladorMax connection
    timer.mark('tabulador_check_start');
    logMessage(LogLevel.INFO, functionName, 'Testing TabuladorMax connection', {
      url: tabuladorUrl,
      trace_id: traceId,
    });
    const tabuladorClient = createClient(tabuladorUrl, tabuladorKey);
    
    const { data, error, count } = await tabuladorClient
      .from('leads')
      .select('id', { count: 'exact' })
      .limit(1);

    timer.mark('tabulador_check_end');
    const tabuladorLatency = timer.getDurationBetween('tabulador_check_start', 'tabulador_check_end') || 0;

    if (error) {
      const supabaseError = extractSupabaseError(error);
      
      logMessage(LogLevel.ERROR, functionName, 'TabuladorMax connection failed', {
        error: supabaseError,
        latency_ms: tabuladorLatency,
        trace_id: traceId,
      });

      result.status = 'error';
      result.checks.tabuladorConnection = {
        status: 'error',
        message: `Failed to connect: ${supabaseError.message}`,
        latencyMs: tabuladorLatency
      };

      if (!result.suggestions) {
        result.suggestions = [];
      }
      result.suggestions.push('Verify TABULADOR_URL is correct');
      result.suggestions.push('Verify TABULADOR_SERVICE_KEY has proper permissions');
      result.suggestions.push('Check if TabuladorMax project is active');
    } else {
      logMessage(LogLevel.INFO, functionName, 'TabuladorMax connection successful', {
        count: count || 0,
        latency_ms: tabuladorLatency,
        trace_id: traceId,
      });

      result.checks.tabuladorConnection = {
        status: 'ok',
        message: 'Connected successfully',
        latencyMs: tabuladorLatency,
        recordCount: count || 0
      };
    }

    // Test Gestão Scouter connection
    timer.mark('gestao_check_start');
    logMessage(LogLevel.INFO, functionName, 'Testing Gestão Scouter connection', {
      url: gestaoUrl,
      trace_id: traceId,
    });

    const gestaoClient = createClient(gestaoUrl, gestaoKey);
    
    const { data: gestaoData, error: gestaoError, count: gestaoCount } = await gestaoClient
      .from('leads')
      .select('id', { count: 'exact' })
      .or('deleted.is.false,deleted.is.null')
      .limit(1);

    timer.mark('gestao_check_end');
    const gestaoLatency = timer.getDurationBetween('gestao_check_start', 'gestao_check_end') || 0;

    if (gestaoError) {
      const supabaseError = extractSupabaseError(gestaoError);
      
      logMessage(LogLevel.ERROR, functionName, 'Gestão Scouter connection failed', {
        error: supabaseError,
        latency_ms: gestaoLatency,
        trace_id: traceId,
      });

      result.status = 'error';
      result.checks.gestaoConnection = {
        status: 'error',
        message: `Failed to connect: ${supabaseError.message}`,
        latencyMs: gestaoLatency
      };

      if (!result.suggestions) {
        result.suggestions = [];
      }
      result.suggestions.push('Verify local Supabase connection is healthy');
      result.suggestions.push('Check if leads table exists and has proper permissions');
    } else {
      logMessage(LogLevel.INFO, functionName, 'Gestão Scouter connection successful', {
        count: gestaoCount || 0,
        latency_ms: gestaoLatency,
        trace_id: traceId,
      });

      result.checks.gestaoConnection = {
        status: 'ok',
        message: 'Connected successfully',
        latencyMs: gestaoLatency,
        recordCount: gestaoCount || 0
      };
    }

    // Update sync_status table
    if (result.checks.gestaoConnection.status === 'ok') {
      timer.mark('sync_status_update_start');
      try {
        await gestaoClient
          .from('sync_status')
          .upsert({
            id: 'health_check',
            project_name: 'health_monitor',
            last_sync_at: new Date().toISOString(),
            last_sync_success: result.status === 'ok',
            total_records: result.checks.tabuladorConnection.recordCount || 0,
            last_error: result.status === 'error' ? result.error : null,
            updated_at: new Date().toISOString()
          });
        
        timer.mark('sync_status_update_end');
        const updateDuration = timer.getDurationBetween('sync_status_update_start', 'sync_status_update_end');
        
        logMessage(LogLevel.INFO, functionName, 'sync_status updated successfully', {
          duration_ms: updateDuration,
          trace_id: traceId,
        });
      } catch (statusError) {
        logMessage(LogLevel.WARN, functionName, 'Failed to update sync_status', {
          error: extractSupabaseError(statusError),
          trace_id: traceId,
        });
        // Don't fail the function because of this
      }
    }

    // Determine overall status (degraded if some checks failed but not all)
    if (result.status !== 'error') {
      const failedChecks = Object.values(result.checks).filter(c => c.status === 'error');
      if (failedChecks.length > 0 && failedChecks.length < Object.keys(result.checks).length) {
        result.status = 'degraded';
        
        logMessage(LogLevel.WARN, functionName, 'Health check degraded', {
          failed_checks: failedChecks.length,
          total_checks: Object.keys(result.checks).length,
          trace_id: traceId,
        });
      }
    }

    // Send Bitrix notification if there are issues and notifications are enabled
    const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
    if (enableBitrix && (result.status === 'error' || result.status === 'degraded')) {
      const notification = await sendBitrixNotification({
        title: `Sync Health Check ${result.status.toUpperCase()}`,
        message: result.error || 'Some health checks failed',
        severity: result.status === 'error' ? 'error' : 'warning',
        metadata: {
          trace_id: traceId,
          checks: result.checks,
          suggestions: result.suggestions,
        },
      });
      result.bitrix_notification_sent = notification.success;
    }

    const totalDuration = timer.getDuration();
    
    logMessage(LogLevel.INFO, functionName, 'Health check completed', {
      status: result.status,
      duration_ms: totalDuration,
      trace_id: traceId,
      performance_marks: timer.getAllMarks(),
    });

    const httpStatus = result.status === 'ok' ? 200 : result.status === 'degraded' ? 207 : 500;
    return jsonResponse(result, httpStatus);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    logMessage(LogLevel.ERROR, functionName, 'Unhandled error in health check', {
      error: errorMessage,
      trace_id: traceId,
      duration_ms: timer.getDuration(),
    });

    result.status = 'error';
    result.error = errorMessage;
    result.suggestions = [
      'Check function logs for detailed error information',
      'Verify all environment variables are configured correctly',
      'Contact system administrator if the problem persists',
    ];

    // Send Bitrix notification for critical errors
    const enableBitrix = Deno.env.get('ENABLE_BITRIX_NOTIFICATIONS') === 'true';
    if (enableBitrix) {
      await sendBitrixNotification({
        title: 'Sync Health Check Critical Error',
        message: errorMessage,
        severity: 'error',
        metadata: { trace_id: traceId, error: errorMessage },
      });
      result.bitrix_notification_sent = true;
    }

    return jsonResponse(result, 500);
  }
});
