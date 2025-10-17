/**
 * Edge Function: Sincronização bidirecional entre Gestão Scouter e TabuladorMax
 * Executa a cada 5 minutos via cron job
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeia uma ficha (Gestão Scouter) para um lead (TabuladorMax)
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
    criado: ficha.criado ? new Date(ficha.criado).toISOString() : null,
    valor_ficha: ficha.valor_ficha,
    etapa: ficha.etapa,
    ficha_confirmada: ficha.ficha_confirmada,
    foto: ficha.foto,
    updated_at: ficha.updated_at || new Date().toISOString()
  };
}

// Mapeia um lead (TabuladorMax) para uma ficha (Gestão Scouter)
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
    criado: lead.criado ? new Date(lead.criado).toISOString() : null,
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    ficha_confirmada: lead.ficha_confirmada,
    foto: lead.foto,
    raw: lead,
    updated_at: lead.updated_at || new Date().toISOString(),
    deleted: false
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
    // Cliente Gestão Scouter (ngestyxtopvfeyenyvgt)
    const gestaoUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const gestaoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const gestao = createClient(gestaoUrl, gestaoKey);

    // Cliente TabuladorMax (gkvvtfqfggddzotxltxf)
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    const tabulador = createClient(tabuladorUrl, tabuladorKey);

    // 1. Buscar última sincronização
    const { data: lastSync } = await gestao
      .from('sync_status')
      .select('last_sync_at')
      .eq('project_name', 'tabulador_max')
      .single();

    const lastSyncDate = lastSync?.last_sync_at 
      ? new Date(lastSync.last_sync_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Últimas 24h se primeira sync

    console.log(`Última sincronização: ${lastSyncDate}`);

    // 2. Buscar registros modificados em Gestão Scouter
    const { data: gestaoUpdates, error: gestaoError } = await gestao
      .from('fichas')
      .select('*')
      .gte('updated_at', lastSyncDate)
      .eq('deleted', false)
      .order('updated_at', { ascending: true });

    if (gestaoError) {
      errors.push(`Erro ao buscar de Gestão Scouter: ${gestaoError.message}`);
    }

    // 3. Buscar registros modificados em TabuladorMax (tabela LEADS)
    const { data: tabuladorUpdates, error: tabuladorError } = await tabulador
      .from('leads')
      .select('*')
      .gte('updated_at', lastSyncDate)
      .order('updated_at', { ascending: true });

    if (tabuladorError) {
      errors.push(`Erro ao buscar de TabuladorMax: ${tabuladorError.message}`);
    }

    let gestaoToTabuladorCount = 0;
    let tabuladorToGestaoCount = 0;
    let conflictsResolved = 0;

    // 4. Detectar conflitos (mesmo ID modificado em ambos)
    const gestaoIds = new Set((gestaoUpdates || []).map(f => f.id));
    const tabuladorIds = new Set((tabuladorUpdates || []).map(f => f.id));
    const conflictIds = [...gestaoIds].filter(id => tabuladorIds.has(id));

    // 5. Sincronizar Gestão → TabuladorMax (exceto conflitos)
    if (gestaoUpdates && gestaoUpdates.length > 0) {
      const toSync = gestaoUpdates.filter(f => !conflictIds.includes(f.id));
      
      if (toSync.length > 0) {
        // Mapear fichas para leads
        const leadsToSync = toSync.map(mapFichaToLead);
        
        const { data, error } = await tabulador
          .from('leads')
          .upsert(leadsToSync, { onConflict: 'id' })
          .select('id');

        if (error) {
          errors.push(`Erro ao sincronizar para TabuladorMax: ${error.message}`);
        } else {
          gestaoToTabuladorCount = data?.length || 0;
        }
      }
    }

    // 6. Sincronizar TabuladorMax → Gestão (exceto conflitos)
    if (tabuladorUpdates && tabuladorUpdates.length > 0) {
      const toSync = tabuladorUpdates.filter(f => !conflictIds.includes(f.id));
      
      if (toSync.length > 0) {
        // Mapear leads para fichas
        const fichasToSync = toSync.map(mapLeadToFicha);
        
        const { data, error } = await gestao
          .from('fichas')
          .upsert(fichasToSync, { onConflict: 'id' })
          .select('id');

        if (error) {
          errors.push(`Erro ao sincronizar para Gestão: ${error.message}`);
        } else {
          tabuladorToGestaoCount = data?.length || 0;
        }
      }
    }

    // 7. Resolver conflitos (última modificação vence)
    for (const conflictId of conflictIds) {
      const gestaoRecord = gestaoUpdates?.find(f => f.id === conflictId);
      const tabuladorRecord = tabuladorUpdates?.find(f => f.id === conflictId);

      if (!gestaoRecord || !tabuladorRecord) continue;

      const gestaoTime = new Date(gestaoRecord.updated_at).getTime();
      const tabuladorTime = new Date(tabuladorRecord.updated_at).getTime();

      // O mais recente vence
      if (gestaoTime > tabuladorTime) {
        // Gestão é mais recente → atualizar TabuladorMax
        const leadToSync = mapFichaToLead(gestaoRecord);
        const { error } = await tabulador
          .from('leads')
          .upsert([leadToSync], { onConflict: 'id' });
        
        if (!error) conflictsResolved++;
      } else {
        // TabuladorMax é mais recente → atualizar Gestão
        const fichaToSync = mapLeadToFicha(tabuladorRecord);
        const { error } = await gestao
          .from('fichas')
          .upsert([fichaToSync], { onConflict: 'id' });
        
        if (!error) conflictsResolved++;
      }
    }

    // 8. Atualizar status de sincronização
    const now = new Date().toISOString();
    
    await gestao
      .from('sync_status')
      .upsert({
        project_name: 'tabulador_max',
        last_sync_at: now,
        last_sync_success: errors.length === 0,
        total_records: gestaoToTabuladorCount + tabuladorToGestaoCount,
        last_error: errors.length > 0 ? errors.join('; ') : null,
        updated_at: now
      }, { onConflict: 'project_name' });

    // 9. Registrar log
    await gestao
      .from('sync_logs')
      .insert({
        sync_direction: 'bidirectional',
        records_synced: gestaoToTabuladorCount + tabuladorToGestaoCount,
        records_failed: errors.length,
        errors: errors.length > 0 ? { errors } : null,
        started_at: new Date(startTime).toISOString(),
        completed_at: now,
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

    console.log('Sincronização concluída:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
