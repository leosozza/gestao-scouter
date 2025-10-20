/**
 * Edge Function: Sincronização incremental entre Gestão Scouter e TabuladorMax
 * 
 * Suporta sincronização incremental pull (TabuladorMax -> Gestão) ou 
 * push (Gestão -> TabuladorMax) baseada em updated_at desde o último checkpoint.
 * 
 * Query params:
 * - direction: 'pull' ou 'push' (padrão: 'pull')
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

/**
 * Normaliza data para formato ISO string
 */
function normalizeDate(dateValue: unknown): string | null {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extrai data de atualização com fallback para outros campos
 */
function getUpdatedAtDate(record: Record<string, unknown>): string {
  const dateValue = (record as any).updated_at || (record as any).updated || (record as any).modificado || (record as any).criado;
  return normalizeDate(dateValue) || new Date().toISOString();
}

/**
 * Mapeia um lead (Gestão Scouter) para lead (TabuladorMax)
 */
function mapLocalToTabulador(lead: Record<string, unknown>) {
  return {
    id: (lead as any).id,
    nome: (lead as any).nome,
    telefone: (lead as any).telefone,
    email: (lead as any).email,
    idade: (lead as any).idade,
    projeto: (lead as any).projeto,
    scouter: (lead as any).scouter,
    supervisor: (lead as any).supervisor,
    localizacao: (lead as any).localizacao,
    latitude: (lead as any).latitude,
    longitude: (lead as any).longitude,
    local_da_abordagem: (lead as any).local_da_abordagem,
    criado: normalizeDate((lead as any).criado),
    valor_ficha: (lead as any).valor_ficha,
    etapa: (lead as any).etapa,
    ficha_confirmada: (lead as any).ficha_confirmada,
    foto: (lead as any).foto,
    updated_at: getUpdatedAtDate(lead),
  };
}

/**
 * Mapeia um lead (TabuladorMax) para lead (Gestão Scouter)
 */
function mapTabuladorToLocal(lead: Record<string, unknown>) {
  return {
    id: String((lead as any).id),
    nome: (lead as any).nome,
    telefone: (lead as any).telefone,
    email: (lead as any).email,
    idade: (lead as any).idade ? String((lead as any).idade) : null,
    projeto: (lead as any).projeto,
    scouter: (lead as any).scouter,
    supervisor: (lead as any).supervisor,
    localizacao: (lead as any).localizacao,
    latitude: (lead as any).latitude,
    longitude: (lead as any).longitude,
    local_da_abordagem: (lead as any).local_da_abordagem,
    criado: normalizeDate((lead as any).criado),
    valor_ficha: (lead as any).valor_ficha,
    etapa: (lead as any).etapa,
    ficha_confirmada: (lead as any).ficha_confirmada,
    foto: (lead as any).foto,
    raw: lead,
    updated_at: getUpdatedAtDate(lead),
    deleted: false,
    sync_source: 'TabuladorMax',
    last_synced_at: new Date().toISOString(),
  };
}

interface SyncResult {
  success: boolean;
  direction: string;
  records_synced: number;
  conflicts_resolved: number;
  errors: string[];
  processing_time_ms: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Parse query params
    const url = new URL(req.url);
    const direction = url.searchParams.get('direction') || 'pull';
    
    if (!['pull', 'push'].includes(direction)) {
      return new Response(
        JSON.stringify({ error: 'Invalid direction. Use "pull" or "push"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 [Sync] Iniciando sincronização incremental (${direction})...`);
    console.log('📡 [Sync] Gestão Scouter URL:', Deno.env.get('SUPABASE_URL'));
    console.log('📡 [Sync] TabuladorMax URL:', Deno.env.get('TABULADOR_URL'));

    // Inicialização dos clientes Supabase
    const gestao = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const tabulador = createClient(
      Deno.env.get('TABULADOR_URL') ?? '',
      Deno.env.get('TABULADOR_SERVICE_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Prefer: 'return=representation', 'Content-Type': 'application/json' } },
      }
    );

    // 1. Buscar última sincronização
    const { data: lastSync } = await gestao
      .from('sync_status')
      .select('last_sync_at')
      .eq('id', 'tabulador_max_leads')
      .single();

    const lastSyncDate = lastSync?.last_sync_at
      ? new Date(lastSync.last_sync_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`📅 [Sync] Última sincronização: ${lastSyncDate}`);
    console.log(`📅 [Sync] Direção: ${direction}`);

    let recordsSynced = 0;
    const conflictsResolved = 0;

    if (direction === 'pull') {
      // PULL: TabuladorMax -> Gestão Scouter
      console.log('📥 [Sync] Buscando atualizações de TabuladorMax...');
      
      // Try different table name variations
      const tableVariations = ['leads', '"Leads"', 'Leads'];
      let tabuladorUpdates = null;
      let tabuladorError = null;
      
      for (const tableName of tableVariations) {
        console.log(`🔍 [Sync] Tentando tabela: ${tableName}`);
        const result = await tabulador
          .from(tableName)
          .select('*')
          .gte('updated_at', lastSyncDate)
          .order('updated_at', { ascending: true });
        
        if (!result.error && result.data) {
          tabuladorUpdates = result.data;
          console.log(`✅ [Sync] Encontrado com ${tableName}: ${tabuladorUpdates.length} registros`);
          break;
        } else {
          tabuladorError = result.error;
          console.log(`❌ [Sync] Falha com ${tableName}: ${result.error?.message}`);
        }
      }

      if (tabuladorError && !tabuladorUpdates) {
        console.error('❌ [Sync] Erro ao buscar de TabuladorMax:', tabuladorError);
        errors.push(`Erro ao buscar de TabuladorMax: ${tabuladorError.message}`);
      } else if (tabuladorUpdates && tabuladorUpdates.length > 0) {
        console.log(`📦 [Sync] ${tabuladorUpdates.length} registros para sincronizar`);
        
        const leadsToSync = tabuladorUpdates.map(mapTabuladorToLocal);
        const { data, error } = await gestao
          .from('leads')
          .upsert(leadsToSync, { onConflict: 'id' })
          .select('id');
        
        if (!error) {
          recordsSynced = data?.length || 0;
          console.log(`✅ [Sync] ${recordsSynced} registros sincronizados (pull)`);
        } else {
          console.error('❌ [Sync] Erro ao sincronizar:', error);
          errors.push(`Erro ao sincronizar TabuladorMax → Gestão: ${error.message}`);
        }
      } else {
        console.log('ℹ️ [Sync] Nenhum registro novo para sincronizar');
      }
    } else {
      // PUSH: Gestão Scouter -> TabuladorMax
      console.log('📤 [Sync] Buscando atualizações de Gestão Scouter...');
      
      const loopWindowMs = Number(Deno.env.get('SYNC_LOOP_WINDOW_MS') || '60000');
      const ignoreSource = Deno.env.get('SYNC_IGNORE_SOURCE') || 'TabuladorMax';
      
      const { data: gestaoUpdatesRaw, error: gestaoError } = await gestao
        .from('leads')
        .select('*')
        .gte('updated_at', lastSyncDate)
        .or('deleted.is.false,deleted.is.null')
        .order('updated_at', { ascending: true });

      if (gestaoError) {
        console.error('❌ [Sync] Erro ao buscar de Gestão Scouter:', gestaoError);
        errors.push(`Erro ao buscar de Gestão Scouter: ${gestaoError.message}`);
      } else {
        // Filtrar registros que vieram do TabuladorMax recentemente (evitar loop)
        const now = Date.now();
        const gestaoUpdates = (gestaoUpdatesRaw || []).filter((l: any) => {
          if (l.sync_source === ignoreSource && l.last_synced_at) {
            const diff = now - new Date(l.last_synced_at).getTime();
            if (diff < loopWindowMs) return false;
          }
          return true;
        });

        if (gestaoUpdates.length > 0) {
          console.log(`📦 [Sync] ${gestaoUpdates.length} registros para sincronizar`);
          
          const leadsToSync = gestaoUpdates.map(mapLocalToTabulador);
          const { data, error } = await tabulador
            .from('leads')
            .upsert(leadsToSync, { onConflict: 'id' })
            .select('id');
          
          if (!error) {
            recordsSynced = data?.length || 0;
            console.log(`✅ [Sync] ${recordsSynced} registros sincronizados (push)`);
            
            // Atualizar sync_source e last_synced_at nos registros locais
            const idsToUpdate = gestaoUpdates.map((l: any) => l.id);
            await gestao
              .from('leads')
              .update({ 
                sync_source: 'Gestao',
                last_synced_at: new Date().toISOString()
              })
              .in('id', idsToUpdate);
          } else {
            console.error('❌ [Sync] Erro ao sincronizar:', error);
            errors.push(`Erro ao sincronizar Gestão → TabuladorMax: ${error.message}`);
          }
        } else {
          console.log('ℹ️ [Sync] Nenhum registro novo para sincronizar');
        }
      }
    }

    // Atualizar status e logs
    const timestamp = new Date().toISOString();
    await gestao.from('sync_status').upsert({
      id: 'tabulador_max_leads',
      project_name: 'TabuladorMax',
      last_sync_at: timestamp,
      last_sync_success: errors.length === 0,
      total_records: recordsSynced,
      last_error: errors.length ? errors.join('; ') : null,
      updated_at: timestamp
    }, { onConflict: 'id' });

    // Log detalhado
    await gestao.from('sync_logs_detailed').insert({
      endpoint: 'sync-tabulador',
      table_name: 'leads',
      status: errors.length === 0 ? 'success' : 'error',
      records_count: recordsSynced,
      execution_time_ms: Date.now() - startTime,
      response_data: { direction, records_synced: recordsSynced },
      error_message: errors.length > 0 ? errors.join('; ') : null,
      metadata: { direction }
    });

    // Log geral
    await gestao.from('sync_logs').insert({
      sync_direction: direction === 'pull' ? 'tabulador_to_gestao' : 'gestao_to_tabulador',
      records_synced: recordsSynced,
      records_failed: errors.length,
      errors: errors.length ? { errors } : null,
      started_at: new Date(startTime).toISOString(),
      completed_at: timestamp,
      processing_time_ms: Date.now() - startTime,
      metadata: { direction }
    });

    const result: SyncResult = {
      success: errors.length === 0,
      direction,
      records_synced: recordsSynced,
      conflicts_resolved: conflictsResolved,
      errors,
      processing_time_ms: Date.now() - startTime
    };

    console.log('✅ [Sync] Concluída:', result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erro na sincronização:', message);
    const result: SyncResult = {
      success: false,
      direction: 'unknown',
      records_synced: 0,
      conflicts_resolved: 0,
      errors: [message],
      processing_time_ms: Date.now() - startTime
    };
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});