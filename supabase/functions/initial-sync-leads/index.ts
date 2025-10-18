/**
 * Edge Function: Migração Inicial de Leads do TabuladorMax para Gestão Scouter
 * 
 * Busca TODOS os leads do TabuladorMax e faz upsert em lotes na tabela fichas
 * do projeto Gestão Scouter.
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

interface MigrationResult {
  success: boolean;
  total_leads: number;
  migrated: number;
  failed: number;
  errors: string[];
  processing_time_ms: number;
}

interface Lead {
  id: string | number;
  nome?: string;
  telefone?: string;
  email?: string;
  idade?: string | number;
  projeto?: string;
  scouter?: string;
  supervisor?: string;
  localizacao?: string;
  latitude?: number;
  longitude?: number;
  local_da_abordagem?: string;
  criado?: string;
  valor_ficha?: number;
  etapa?: string;
  ficha_confirmada?: string;
  foto?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Normaliza um lead para o formato de ficha
function mapLeadToFicha(lead: Lead) {
  let criadoNormalized: string | undefined;
  if (lead.criado) {
    try {
      const date = new Date(lead.criado);
      if (!isNaN(date.getTime())) {
        criadoNormalized = date.toISOString();
      }
    } catch (e) {
      console.warn(`Erro ao normalizar data para lead ${lead.id}:`, e);
    }
  }

  return {
    id: String(lead.id),
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    idade: lead.idade ? String(lead.idade) : undefined,
    projeto: lead.projeto,
    scouter: lead.scouter,
    supervisor: lead.supervisor,
    localizacao: lead.localizacao,
    latitude: lead.latitude,
    longitude: lead.longitude,
    local_da_abordagem: lead.local_da_abordagem,
    criado: criadoNormalized,
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    ficha_confirmada: lead.ficha_confirmada,
    foto: lead.foto,
    raw: lead,
    updated_at: lead.updated_at || new Date().toISOString(),
    deleted: false,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    console.log('🚀 Iniciando migração inicial de leads...');
    console.log('📡 Endpoint:', `${Deno.env.get('TABULADOR_URL')}/rest/v1/leads`);
    console.log('🎯 Tabela origem: leads (TabuladorMax)');
    console.log('🎯 Tabela destino: fichas (Gestão Scouter)');

    // Cliente Gestão Scouter
    const gestaoUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const gestaoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const gestao = createClient(gestaoUrl, gestaoKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Cliente TabuladorMax
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
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

    // Buscar TODOS os leads do TabuladorMax
    console.log('📥 Buscando todos os leads do TabuladorMax...');
    let allLeads: Lead[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      console.log(`📄 Buscando página ${page + 1}...`);
      
      const { data, error } = await tabulador
        .from('leads')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id', { ascending: true });

      if (error) {
        console.error(`❌ Erro ao buscar leads (página ${page}):`, error);
        
        // Handle 406 error specifically
        if (error.code === '406' || error.message?.includes('406')) {
          throw new Error(`Erro 406 na página ${page}: Verifique os headers da requisição. O TabuladorMax pode estar exigindo headers específicos. Erro original: ${error.message}`);
        }
        
        throw new Error(`Erro ao buscar leads (página ${page}): ${error.message}`);
      }

      if (data && data.length > 0) {
        allLeads.push(...data);
        console.log(`   ✅ Página ${page + 1}: ${data.length} registros`);
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ Total de ${allLeads.length} leads encontrados`);
    console.log('📊 Status da busca:', {
      páginas_processadas: page,
      total_registros: allLeads.length,
      tempo_parcial: `${Date.now() - startTime}ms`,
    });

    if (allLeads.length === 0) {
      const result: MigrationResult = {
        success: true,
        total_leads: 0,
        migrated: 0,
        failed: 0,
        errors: [],
        processing_time_ms: Date.now() - startTime
      };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar leads para fichas
    console.log('🔄 Normalizando dados...');
    const fichas = allLeads.map(mapLeadToFicha);

    // Processar em lotes de 1000
    const BATCH_SIZE = 1000;
    let totalMigrated = 0;
    let totalFailed = 0;

    console.log(`🔄 Processando ${fichas.length} fichas em lotes de ${BATCH_SIZE}...`);

    for (let i = 0; i < fichas.length; i += BATCH_SIZE) {
      const batch = fichas.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      try {
        const { data, error } = await gestao
          .from('leads')
          .upsert(batch, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select('id');

        if (error) {
          console.error(`❌ Erro no lote ${batchNumber}:`, error.message);
          errors.push(`Lote ${batchNumber}: ${error.message}`);
          totalFailed += batch.length;
        } else {
          totalMigrated += data?.length || 0;
          console.log(`✅ Lote ${batchNumber}: ${data?.length || 0} registros migrados`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`❌ Erro crítico no lote ${batchNumber}:`, errorMsg);
        errors.push(`Lote ${batchNumber}: ${errorMsg}`);
        totalFailed += batch.length;
      }
    }

    // Atualizar status de sincronização
    const now = new Date().toISOString();
    await gestao
      .from('sync_status')
      .upsert({
        project_name: 'TabuladorMax',
        last_sync_at: now,
        last_sync_success: errors.length === 0,
        total_records: totalMigrated,
        last_error: errors.length > 0 ? errors.join('; ') : null,
        updated_at: now
      }, { onConflict: 'project_name' });

    // Registrar log
    await gestao
      .from('sync_logs')
      .insert({
        sync_direction: 'tabulador_to_gestao',
        records_synced: totalMigrated,
        records_failed: totalFailed,
        errors: errors.length > 0 ? { errors } : null,
        started_at: new Date(startTime).toISOString(),
        completed_at: now,
        processing_time_ms: Date.now() - startTime
      });

    const result: MigrationResult = {
      success: errors.length === 0,
      total_leads: allLeads.length,
      migrated: totalMigrated,
      failed: totalFailed,
      errors,
      processing_time_ms: Date.now() - startTime
    };

    console.log('✅ Migração concluída:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro fatal na migração:', message);
    
    const result: MigrationResult = {
      success: false,
      total_leads: 0,
      migrated: 0,
      failed: 0,
      errors: [message],
      processing_time_ms: Date.now() - startTime
    };

    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
