/**
 * Edge Function: Migração Inicial de Leads do TabuladorMax para Gestão Scouter
 * 
 * Busca TODOS os leads do TabuladorMax e faz upsert em lotes na tabela leads
 * do projeto Gestão Scouter. Esta é a sincronização FULL (pull).
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

// Normaliza um lead do TabuladorMax para o formato local
function mapLeadToLocal(lead: Lead) {
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
    sync_source: 'TabuladorMax',
    last_synced_at: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    console.log('🚀 [InitialSync] Iniciando sincronização FULL de leads...');
    
    // Validate environment variables
    const gestaoUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const gestaoKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    if (!gestaoUrl || !gestaoKey) {
      throw new Error('Credenciais do Gestão Scouter não configuradas (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    }
    
    if (!tabuladorUrl || !tabuladorKey) {
      throw new Error('Credenciais do TabuladorMax não configuradas (TABULADOR_URL, TABULADOR_SERVICE_KEY)');
    }
    
    console.log('📡 [InitialSync] Gestão URL:', gestaoUrl);
    console.log('📡 [InitialSync] TabuladorMax URL:', tabuladorUrl);
    console.log('🎯 [InitialSync] Tabela origem: leads (TabuladorMax)');
    console.log('🎯 [InitialSync] Tabela destino: leads (Gestão Scouter)');

    // Cliente Gestão Scouter
    const gestao = createClient(gestaoUrl, gestaoKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Cliente TabuladorMax
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
    console.log('📥 [InitialSync] Buscando todos os leads do TabuladorMax...');
    
    // Try different table name variations
    const tableVariations = ['leads', '"Leads"', 'Leads', '"leads"'];
    const allLeads: Lead[] = [];
    let successTableName = '';
    let lastError = null;
    let tableTestResults: any[] = [];
    
    // First, try using RPC to list tables (more reliable)
    console.log('🔍 [InitialSync] Tentando listar tabelas via RPC...');
    const { data: rpcTables, error: rpcError } = await tabulador.rpc('list_public_tables');
    
    if (!rpcError && rpcTables) {
      console.log(`✅ [InitialSync] RPC list_public_tables retornou ${rpcTables.length} tabelas:`, rpcTables.map((t: any) => t.table_name));
      // Add tables from RPC to variations
      for (const t of rpcTables) {
        const tname = (t as any).table_name;
        if (tname && !tableVariations.includes(tname)) {
          tableVariations.push(tname);
        }
      }
    } else {
      console.log(`⚠️ [InitialSync] RPC list_public_tables falhou ou não está disponível: ${rpcError?.message || 'sem erro'}`);
    }
    
    // Now try each table variation to find the right one
    console.log(`🔍 [InitialSync] Testando ${tableVariations.length} variações de nomes de tabela...`);
    for (const tableName of tableVariations) {
      console.log(`🔍 [InitialSync] Testando tabela: ${tableName}`);
      const testStart = Date.now();
      const { count, error } = await tabulador
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      const testDuration = Date.now() - testStart;
      
      tableTestResults.push({
        table_name: tableName,
        exists: !error,
        count: count || 0,
        error: error?.message,
        error_code: error?.code,
        duration_ms: testDuration
      });
      
      if (!error) {
        successTableName = tableName;
        console.log(`✅ [InitialSync] Tabela encontrada: ${tableName} (count: ${count}, ${testDuration}ms)`);
        break;
      } else {
        lastError = error;
        console.log(`❌ [InitialSync] Falha com ${tableName}: ${error.message} (code: ${error.code}, ${testDuration}ms)`);
      }
    }
    
    if (!successTableName) {
      const errorMsg = `Nenhuma tabela de leads encontrada após testar ${tableVariations.length} variações. ` +
        `Último erro: ${lastError?.message || 'desconhecido'} (${lastError?.code || 'sem código'}). ` +
        `Testados: ${tableVariations.join(', ')}`;
      console.error(`❌ [InitialSync] ${errorMsg}`);
      console.log('📊 [InitialSync] Resultados dos testes:', JSON.stringify(tableTestResults, null, 2));
      
      errors.push(errorMsg);
      errors.push('Verifique: 1) Se a tabela "leads" existe no TabuladorMax, 2) Se TABULADOR_SERVICE_KEY está correta, 3) Políticas RLS');
      
      throw new Error(errorMsg);
    }
    
    console.log(`🎯 [InitialSync] Usando tabela: ${successTableName}`);
    
    // Now fetch all data using pagination
    console.log(`📄 [InitialSync] Buscando dados da tabela ${successTableName}...`);
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      console.log(`📄 [InitialSync] Buscando página ${page + 1} de ${successTableName}...`);
      
      const { data, error } = await tabulador
        .from(successTableName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id', { ascending: true });

      if (error) {
        console.error(`❌ [InitialSync] Erro ao buscar leads (página ${page}):`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Handle 406 error specifically
        if (error.code === '406' || error.message?.includes('406')) {
          throw new Error(`Erro 406 na página ${page}: Verifique os headers da requisição. O TabuladorMax pode estar exigindo headers específicos. Erro original: ${error.message}`);
        }
        
        throw new Error(`Erro ao buscar leads (página ${page}): ${error.message} (código: ${error.code})`);
      }

      if (data && data.length > 0) {
        allLeads.push(...data);
        console.log(`   ✅ [InitialSync] Página ${page + 1}: ${data.length} registros (total acumulado: ${allLeads.length})`);
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ [InitialSync] Total de ${allLeads.length} leads encontrados`);
    console.log('📊 [InitialSync] Status da busca:', {
      tabela_usada: successTableName,
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

    // Normalizar leads
    console.log('🔄 Normalizando dados...');
    const leadsToSync = allLeads.map(mapLeadToLocal);

    // Processar em lotes (usar variável de ambiente ou padrão)
    const BATCH_SIZE = Number(Deno.env.get('SYNC_BATCH_SIZE') || '500');
    let totalMigrated = 0;
    let totalFailed = 0;

    console.log(`🔄 Processando ${leadsToSync.length} leads em lotes de ${BATCH_SIZE}...`);

    for (let i = 0; i < leadsToSync.length; i += BATCH_SIZE) {
      const batch = leadsToSync.slice(i, i + BATCH_SIZE);
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
          console.log(`✅ Lote ${batchNumber}: ${data?.length || 0} registros sincronizados`);
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
        id: 'tabulador_max_leads',
        project_name: 'TabuladorMax',
        last_sync_at: now,
        last_full_sync_at: now,
        last_sync_success: errors.length === 0,
        total_records: totalMigrated,
        last_error: errors.length > 0 ? errors.join('; ') : null,
        updated_at: now
      }, { onConflict: 'id' });

    // Registrar log detalhado
    await gestao
      .from('sync_logs_detailed')
      .insert({
        endpoint: 'initial-sync-leads',
        table_name: 'leads',
        status: errors.length === 0 ? 'success' : 'error',
        records_count: totalMigrated,
        execution_time_ms: Date.now() - startTime,
        response_data: { total_leads: allLeads.length, migrated: totalMigrated, failed: totalFailed },
        error_message: errors.length > 0 ? errors.join('; ') : null
      });

    // Registrar log geral
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
