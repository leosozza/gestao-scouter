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
      table_name: 'fichas'
    })

    if (schemaError) {
      console.warn('⚠️ [TabMax Sync] Não foi possível introspectar schema remoto:', schemaError.message)
    }

    // Sync fichas from TabuladorMax to local
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
      const { data: remoteFichas, error: fetchError } = await remoteDb
        .from('fichas_sync')
        .select('*')
        .range(offset, offset + pageSize - 1)

      if (fetchError) {
        console.error(`❌ [TabMax Sync] Erro ao buscar dados remotos:`, fetchError)
        stats.errors.push(`Fetch error at offset ${offset}: ${fetchError.message}`)
        break
      }

      if (!remoteFichas || remoteFichas.length === 0) {
        console.log('✅ [TabMax Sync] Sem mais registros para sincronizar')
        hasMore = false
        break
      }

      stats.total += remoteFichas.length
      console.log(`📥 [TabMax Sync] Processando ${remoteFichas.length} registros...`)

      // Upsert batch to local DB
      for (const ficha of remoteFichas) {
        try {
          const { error: upsertError } = await localDb
            .from('fichas')
            .upsert({
              id: ficha.id,
              scouter: ficha.scouter,
              projeto: ficha.projeto,
              criado: ficha.criado,
              valor_ficha: ficha.valor_ficha,
              aprovado: ficha.aprovado,
              deleted: ficha.deleted || false,
              raw: {
                nome: ficha.nome,
                idade: ficha.idade,
                telefone: ficha.telefone,
                email: ficha.email,
                etapa: ficha.etapa,
                local_da_abordagem: ficha.local_da_abordagem,
                ficha_confirmada: ficha.ficha_confirmada,
                presenca_confirmada: ficha.presenca_confirmada,
                supervisor_do_scouter: ficha.supervisor_do_scouter,
                sync_source: 'tabulador_max',
                synced_at: new Date().toISOString(),
              },
              updated_at: ficha.updated_at || new Date().toISOString(),
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })

          if (upsertError) {
            console.error(`❌ [TabMax Sync] Erro ao inserir/atualizar ficha ${ficha.id}:`, upsertError)
            stats.failed++
            stats.errors.push(`Ficha ${ficha.id}: ${upsertError.message}`)
          } else {
            stats.updated++
          }
        } catch (err) {
          console.error(`❌ [TabMax Sync] Exceção ao processar ficha ${ficha.id}:`, err)
          stats.failed++
          stats.errors.push(`Ficha ${ficha.id}: ${err.message}`)
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
      table_name: 'fichas',
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
