/**
 * Edge Function: Sincronização bidirecional entre Gestão Scouter e TabuladorMax
 * Executa a cada 5 minutos via cron job
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
  const dateValue = record.updated_at || record.updated || record.modificado || record.criado;
  return normalizeDate(dateValue) || new Date().toISOString();
}

/**
 * Mapeia uma ficha (Gestão Scouter) para um lead (TabuladorMax)
 */
function mapFichaToLead(ficha: any) {
  return {
    id: ficha.id,
    nome: ficha.nome,
    telefone: ficha.telefone,
    email: ficha.email,
    idade: ficha.idade,
    projeto: ficha.projeto,
    scouter: ficha.scouter,
    supervisor: ficha.supervisor,
    localizacao: ficha.localizacao,
    latitude: ficha.latitude,
    longitude: ficha.longitude,
    local_da_abordagem: ficha.local_da_abordagem,
    criado: normalizeDate(ficha.criado),
    valor_ficha: ficha.valor_ficha,
    etapa: ficha.etapa,
    ficha_confirmada: ficha.ficha_confirmada,
    foto: ficha.foto,
    updated_at: getUpdatedAtDate(ficha)
  };
}

/**
 * Mapeia um lead (TabuladorMax) para uma ficha (Gestão Scouter)
 */
function mapLeadToFicha(lead: any) {
  return {
    id: String(lead.id),
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    idade: lead.idade ? String(lead.idade) : null,
    projeto: lead.projeto,
    scouter: lead.scouter,
    supervisor: lead.supervisor,
    localizacao: lead.localizacao,
    latitude: lead.latitude,
    longitude: lead.longitude,
    local_da_abordagem: lead.local_da_abordagem,
    criado: normalizeDate(lead.criado),
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    ficha_confirmada: lead.ficha_confirmada,
    foto: lead.foto,
    raw: lead,
    updated_at: getUpdatedAtDate(lead),
    deleted: false,
    sync_source: lead.sync_source || 'TabuladorMax',
    last_synced_at: new Date().toISOString()
  };
}

interface SyncResult {
  success: boolean;
  gestao_to_tabulador: number;
  tabulador_to_gestao: number;
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
    console.log('🔄 [Sync] Iniciando sincronização bidirecional...');
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
        global: { headers: { 'Prefer': 'return=representation', 'Content-Type': 'application/json' } },
      }
    );

    // 1. Buscar última sincronização
    const { data: lastSync } = await gestao
      .from('sync_status')
      .select('last_sync_at')
      .eq('project_name', 'tabulador_max')
      .single();

    const lastSyncDate = lastSync?.last_sync_at
      ? new Date(lastSync.last_sync_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`📅 [Sync] Última sincronização: ${lastSyncDate}`);

    // 2. Buscar registros modificados em Gestão Scouter
    console.log('📥 [Sync] Buscando atualizações de Gestão Scouter...');
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
    }

    const now = Date.now();
    const gestaoUpdates = (gestaoUpdatesRaw || []).filter(f => {
      if (f.sync_source === ignoreSource && f.last_synced_at) {
        const diff = now - new Date(f.last_synced_at).getTime();
        if (diff < loopWindowMs) return false;
      }
      return true;
    });

    // 3. Buscar registros modificados em TabuladorMax
    console.log('📥 [Sync] Buscando atualizações de TabuladorMax...');
    const { data: tabuladorUpdates, error: tabuladorError } = await tabulador
      .from('leads')
      .select('*')
      .gte('updated_at', lastSyncDate)
      .order('updated_at', { ascending: true });

    if (tabuladorError) {
      console.error('❌ [Sync] Erro ao buscar de TabuladorMax:', tabuladorError);
      errors.push(`Erro ao buscar de TabuladorMax: ${tabuladorError.message}`);
    }

    let gestaoToTabuladorCount = 0;
    let tabuladorToGestaoCount = 0;
    let conflictsResolved = 0;

    // 4. Detectar conflitos
    const gestaoIds = new Set((gestaoUpdates || []).map(f => f.id));
    const tabuladorIds = new Set((tabuladorUpdates || []).map(f => f.id));
    const conflictIds = [...gestaoIds].filter(id => tabuladorIds.has(id));

    // 5. Gestão → TabuladorMax
    const toSyncGestao = (gestaoUpdates || []).filter(f => !conflictIds.includes(f.id));
    if (toSyncGestao.length > 0) {
      const leadsToSync = toSyncGestao.map(mapFichaToLead);
      const { data, error } = await tabulador
        .from('leads')
        .upsert(leadsToSync, { onConflict: 'id' })
        .select('id');
      if (!error) gestaoToTabuladorCount = data?.length || 0;
      else errors.push(`Erro ao sincronizar Gestão → TabuladorMax: ${error.message}`);
    }

    // 6. TabuladorMax → Gestão
    const toSyncTabulador = (tabuladorUpdates || []).filter(f => !conflictIds.includes(f.id));
    if (toSyncTabulador.length > 0) {
      const fichasToSync = toSyncTabulador.map(mapLeadToFicha);
      const { data, error } = await gestao
        .from('leads')
        .upsert(fichasToSync, { onConflict: 'id' })
        .select('id');
      if (!error) tabuladorToGestaoCount = data?.length || 0;
      else errors.push(`Erro ao sincronizar TabuladorMax → Gestão: ${error.message}`);
    }

    // 7. Resolver conflitos
    for (const conflictId of conflictIds) {
      const gestaoRecord = gestaoUpdates?.find(f => f.id === conflictId);
      const tabuladorRecord = tabuladorUpdates?.find(f => f.id === conflictId);
      if (!gestaoRecord || !tabuladorRecord) continue;

      const gestaoTime = new Date(gestaoRecord.updated_at).getTime();
      const tabuladorTime = new Date(tabuladorRecord.updated_at).getTime();

      if (gestaoTime > tabuladorTime) {
        const leadToSync = mapFichaToLead(gestaoRecord);
        await tabulador.from('leads').upsert([leadToSync], { onConflict: 'id' });
        conflictsResolved++;
      } else {
        const fichaToSync = mapLeadToFicha(tabuladorRecord);
        await gestao.from('leads').upsert([fichaToSync], { onConflict: 'id' });
        conflictsResolved++;
      }
    }

    // 8. Atualizar status e logs
    const timestamp = new Date().toISOString();
    await gestao.from('sync_status').upsert({
      id: 'tabulador_max',
      project_name: 'tabulador_max',
      last_sync_at: timestamp,
      last_sync_success: errors.length === 0,
      total_records: gestaoToTabuladorCount + tabuladorToGestaoCount,
      last_error: errors.length ? errors.join('; ') : null,
      updated_at: timestamp
    });

    await gestao.from('sync_logs').insert({
      sync_direction: 'bidirectional',
      records_synced: gestaoToTabuladorCount + tabuladorToGestaoCount,
      records_failed: errors.length,
      errors: errors.length ? { errors } : null,
      started_at: new Date(startTime).toISOString(),
      completed_at: timestamp,
      processing_time_ms: Date.now() - startTime
    });

    const result: SyncResult = {
      success: errors.length === 0,
      gestao_to_tabulador: gestaoToTabuladorCount,
      tabulador_to_gestao: tabuladorToGestaoCount,
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
      gestao_to_tabulador: 0,
      tabulador_to_gestao: 0,
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
