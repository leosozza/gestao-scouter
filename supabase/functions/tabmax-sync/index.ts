import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncConfig {
  url: string
  publishable_key: string
  project_id: string
}

interface SyncStats {
  total: number
  inserted: number
  updated: number
  failed: number
  errors: string[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [TabMax Sync] Iniciando sincronização...')

    // Get Supabase client for local DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const localDb = createClient(supabaseUrl, supabaseKey)

    // Get TabuladorMax config from local DB
    const { data: configs, error: configError } = await localDb
      .from('tabulador_config')
      .select('*')
      .eq('enabled', true)
      .limit(1)
      .single()

    if (configError || !configs) {
      console.error('❌ [TabMax Sync] Erro ao buscar configuração:', configError)
      throw new Error('Configuração do TabuladorMax não encontrada ou desabilitada')
    }

    const config: SyncConfig = {
      url: configs.url,
      publishable_key: configs.publishable_key,
      project_id: configs.project_id,
    }

    console.log(`✅ [TabMax Sync] Config carregada: ${config.project_id}`)

    // Create client for remote TabuladorMax DB
    const remoteDb = createClient(config.url, config.publishable_key)

    // Introspect available tables from remote
    const { data: remoteColumns, error: schemaError } = await remoteDb.rpc('get_table_columns', {
      table_name: 'leads'
    })

    if (schemaError) {
      console.warn('⚠️ [TabMax Sync] Não foi possível introspectar schema remoto:', schemaError.message)
    }

    // Sync leads from TabuladorMax to local
    const stats: SyncStats = {
      total: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    }

    // Pagination parameters
    const pageSize = 1000
    let offset = 0
    let hasMore = true

    while (hasMore) {
      console.log(`📦 [TabMax Sync] Buscando registros (offset: ${offset})...`)

      // Fetch batch from remote
      const { data: remoteLeads, error: fetchError } = await remoteDb
        .from('leads_sync')
        .select('*')
        .range(offset, offset + pageSize - 1)

      if (fetchError) {
        console.error(`❌ [TabMax Sync] Erro ao buscar dados remotos:`, fetchError)
        stats.errors.push(`Fetch error at offset ${offset}: ${fetchError.message}`)
        break
      }

      if (!remoteLeads || remoteLeads.length === 0) {
        console.log('✅ [TabMax Sync] Sem mais registros para sincronizar')
        hasMore = false
        break
      }

      stats.total += remoteLeads.length
      console.log(`📥 [TabMax Sync] Processando ${remoteLeads.length} registros...`)

      // Upsert batch to local DB
      for (const lead of remoteLeads) {
        try {
          const { error: upsertError } = await localDb
            .from('leads')
            .upsert({
              id: lead.id,
              scouter: lead.scouter,
              projeto: lead.projeto,
              criado: lead.criado,
              valor_ficha: lead.valor_ficha,
              aprovado: lead.aprovado,
              deleted: lead.deleted || false,
              nome: lead.name || lead.nome,
              age: lead.age,
              telefone: lead.telefone,
              email: lead.email,
              etapa: lead.etapa,
              local_abordagem: lead.local_abordagem,
              ficha_confirmada: lead.ficha_confirmada,
              presenca_confirmada: lead.presenca_confirmada,
              compareceu: lead.compareceu,
              supervisor: lead.responsible,
              sync_source: 'tabulador_max',
              sync_status: 'synced',
              last_sync_at: new Date().toISOString(),
              updated_at: lead.updated_at || new Date().toISOString(),
              raw: lead.raw || {},
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })

          if (upsertError) {
            console.error(`❌ [TabMax Sync] Erro ao inserir/atualizar lead ${lead.id}:`, upsertError)
            stats.failed++
            stats.errors.push(`Lead ${lead.id}: ${upsertError.message}`)
          } else {
            stats.updated++
          }
        } catch (err) {
          console.error(`❌ [TabMax Sync] Exceção ao processar lead ${lead.id}:`, err)
          stats.failed++
          stats.errors.push(`Lead ${lead.id}: ${err.message}`)
        }
      }

      // Check if we should continue
      if (remoteFichas.length < pageSize) {
        hasMore = false
      } else {
        offset += pageSize
      }
    }

    // Log sync summary
    console.log(`✅ [TabMax Sync] Sincronização concluída:`, stats)

    // Save sync log
    await localDb.from('sync_logs').insert({
      endpoint: 'tabmax-sync',
      table_name: 'leads',
      status: stats.failed === 0 ? 'success' : 'error',
      records_count: stats.total,
      response_data: stats,
      execution_time_ms: 0, // TODO: track actual time
    })

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Sincronizados ${stats.updated} registros de ${stats.total} com ${stats.failed} falhas`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ [TabMax Sync] Erro fatal:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
