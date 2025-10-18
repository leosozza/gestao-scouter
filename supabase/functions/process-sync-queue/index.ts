/**
 * Edge Function: Processar fila de sincronização
 * Executa periodicamente (ex: a cada 1 minuto) via cron job
 * 
 * Processa fichas na fila e exporta para TabuladorMax
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  ficha_id: number;
  operation: string;
  payload: any;
  retry_count: number;
}

/**
 * Normaliza data para formato ISO string
 */
function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extrai data de atualização com fallback para outros campos
 */
function getUpdatedAtDate(record: any): string {
  // Prioridade: updated_at -> updated -> modificado -> criado -> now
  const dateValue = record.updated_at || record.updated || record.modificado || record.criado;
  return normalizeDate(dateValue) || new Date().toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Criar clientes Supabase
    const gestaoUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const gestaoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const gestao = createClient(gestaoUrl, gestaoKey);

    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    if (!tabuladorUrl || !tabuladorKey) {
      console.log('⚠️ TabuladorMax não configurado, pulando sincronização');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'TabuladorMax não configurado',
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tabulador = createClient(tabuladorUrl, tabuladorKey);

    // Buscar itens pendentes da fila (até 100 por vez)
    const { data: queueItems, error: queueError } = await gestao
      .from('sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(100);

    if (queueError) {
      throw new Error(`Erro ao buscar fila: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('ℹ️ Nenhum item na fila para processar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum item na fila',
          processed: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Processando ${queueItems.length} itens da fila`);

    let succeeded = 0;
    let failed = 0;

    // Processar cada item
    for (const item of queueItems as QueueItem[]) {
      try {
        // Marcar como processando
        await gestao
          .from('sync_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Mapear ficha para lead
        const lead = {
          id: item.payload.id,
          nome: item.payload.nome,
          telefone: item.payload.telefone,
          email: item.payload.email,
          idade: item.payload.idade,
          projeto: item.payload.projeto,
          scouter: item.payload.scouter,
          supervisor: item.payload.supervisor,
          localizacao: item.payload.localizacao,
          latitude: item.payload.latitude,
          longitude: item.payload.longitude,
          local_da_abordagem: item.payload.local_da_abordagem,
          criado: normalizeDate(item.payload.criado),
          valor_ficha: item.payload.valor_ficha,
          etapa: item.payload.etapa,
          ficha_confirmada: item.payload.ficha_confirmada,
          foto: item.payload.foto,
          modelo: item.payload.modelo,
          tabulacao: item.payload.tabulacao,
          agendado: item.payload.agendado,
          compareceu: item.payload.compareceu,
          confirmado: item.payload.confirmado,
          updated_at: getUpdatedAtDate(item.payload)
        };

        // Fazer upsert no TabuladorMax
        const { error: syncError } = await tabulador
          .from('leads')
          .upsert([lead], { onConflict: 'id' });

        if (syncError) {
          throw syncError;
        }

        // Atualizar ficha com informação de sincronização
        await gestao
          .from('leads')
          .update({ 
            last_synced_at: new Date().toISOString(),
            sync_source: 'Gestao'
          })
          .eq('id', item.ficha_id);

        // Marcar como completo
        await gestao
          .from('sync_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        succeeded++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Erro ao processar item ${item.id}:`, errorMessage);

        // Marcar como falho e incrementar retry
        await gestao
          .from('sync_queue')
          .update({ 
            status: item.retry_count >= 2 ? 'failed' : 'pending',
            retry_count: item.retry_count + 1,
            last_error: errorMessage,
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        failed++;
      }
    }

    // Registrar log
    try {
      const { error: logError } = await gestao
        .from('sync_logs')
        .insert({
          sync_direction: 'gestao_to_tabulador',
          records_synced: succeeded,
          records_failed: failed,
          errors: failed > 0 ? { message: `${failed} itens falharam` } : null,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime,
          metadata: {
            source: 'sync_queue',
            total_items: queueItems.length,
            succeeded,
            failed
          }
        });
      
      if (logError) {
        console.error('Erro ao registrar log de sincronização:', logError);
      }
    } catch (error) {
      console.error('Erro ao inserir sync_logs:', error);
    }

    const result = {
      success: failed === 0,
      processed: queueItems.length,
      succeeded,
      failed,
      processing_time_ms: Date.now() - startTime
    };

    console.log(`✅ Processamento da fila concluído:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal:', message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message,
        processing_time_ms: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
