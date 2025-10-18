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
 * 
 * Variáveis de Ambiente (configurar no Supabase Dashboard):
 * - TABULADOR_URL: URL do projeto TabuladorMax
 * - TABULADOR_SERVICE_KEY: Service role key do TabuladorMax
 * - SUPABASE_URL: URL do projeto Gestão Scouter (injetado automaticamente)
 * - SUPABASE_SERVICE_ROLE_KEY: Service key do Gestão (injetado automaticamente)
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

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
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
}

serve(async (req: Request) => {
  // Apenas POST ou GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const result: HealthCheckResult = {
    status: 'ok',
    timestamp: new Date().toISOString(),
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
    // Variáveis de ambiente
    const tabuladorUrl = Deno.env.get('TABULADOR_URL');
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY');
    const gestaoUrl = Deno.env.get('SUPABASE_URL');
    const gestaoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!tabuladorUrl || !tabuladorKey) {
      result.status = 'error';
      result.error = 'TabuladorMax credentials not configured';
      result.checks.tabuladorConnection = {
        status: 'error',
        message: 'Missing TABULADOR_URL or TABULADOR_SERVICE_KEY'
      };
    } else {
      // Testar conexão com TabuladorMax
      const tabuladorStart = Date.now();
      const tabuladorClient = createClient(tabuladorUrl, tabuladorKey);
      
      const { data, error, count } = await tabuladorClient
        .from('leads')
        .select('id', { count: 'exact' })
        .limit(1);

      const tabuladorLatency = Date.now() - tabuladorStart;

      if (error) {
        result.status = 'error';
        result.checks.tabuladorConnection = {
          status: 'error',
          message: `Failed to connect: ${error.message}`,
          latencyMs: tabuladorLatency
        };
      } else {
        result.checks.tabuladorConnection = {
          status: 'ok',
          message: 'Connected successfully',
          latencyMs: tabuladorLatency,
          recordCount: count || 0
        };
      }
    }

    if (!gestaoUrl || !gestaoKey) {
      result.status = 'error';
      result.error = 'Gestão Scouter credentials not configured';
      result.checks.gestaoConnection = {
        status: 'error',
        message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      };
    } else {
      // Testar conexão com Gestão Scouter
      const gestaoStart = Date.now();
      const gestaoClient = createClient(gestaoUrl, gestaoKey);
      
      const { data, error, count } = await gestaoClient
        .from('leads')
        .select('id', { count: 'exact' })
        .or('deleted.is.false,deleted.is.null')
        .limit(1);

      const gestaoLatency = Date.now() - gestaoStart;

      if (error) {
        result.status = 'error';
        result.checks.gestaoConnection = {
          status: 'error',
          message: `Failed to connect: ${error.message}`,
          latencyMs: gestaoLatency
        };
      } else {
        result.checks.gestaoConnection = {
          status: 'ok',
          message: 'Connected successfully',
          latencyMs: gestaoLatency,
          recordCount: count || 0
        };
      }

      // Atualizar sync_status
      if (result.checks.gestaoConnection.status === 'ok') {
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
        } catch (statusError) {
          console.error('Failed to update sync_status:', statusError);
          // Não falhar a função por isso
        }
      }
    }

    // Status degradado se algum check falhou mas não todos
    if (result.status !== 'error') {
      const failedChecks = Object.values(result.checks).filter(c => c.status === 'error');
      if (failedChecks.length > 0 && failedChecks.length < Object.keys(result.checks).length) {
        result.status = 'degraded';
      }
    }

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: result.status === 'ok' ? 200 : result.status === 'degraded' ? 207 : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    result.status = 'error';
    result.error = String(err);
    
    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
