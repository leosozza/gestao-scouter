// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Lendo as variáveis do .env via Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ [Supabase] Variáveis ausentes. Verifique o arquivo .env')
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// 🔍 Log e smoke test
console.log('[Supabase] URL atual:', SUPABASE_URL)
console.log('[Supabase] Client pronto. Testando leitura de "fichas"...')

async function testarConexaoSupabase() {
  try {
    const { error, count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })

    if (error) console.error('[Supabase] Erro de leitura inicial:', error)
    else console.log(`[Supabase] fichas (count) = ${count}`)
  } catch (err) {
    console.error('[Supabase] Erro inesperado ao testar conexão:', err)
  }
}
testarConexaoSupabase()