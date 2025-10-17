// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// 🔹 Lendo variáveis do .env via Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

// 🔹 Validação de variáveis obrigatórias
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ [Supabase] Variáveis ausentes. Verifique o arquivo .env')
}

// 🔹 Criação do cliente Supabase
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

// ========================================================
// 🔍 TESTE AUTOMÁTICO DE CONEXÃO E CONTAGEM DE REGISTROS
// ========================================================

console.log('[Supabase] URL atual:', SUPABASE_URL)
console.log('[Supabase] Client pronto. Testando leitura de "fichas"...')

async function testarConexaoSupabase() {
  try {
    const { error, count } = await supabase
      .from('fichas')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('[Supabase] Erro de leitura inicial:', error)
    } else {
      console.log(`[Supabase] fichas (count) = ${count}`)
    }
  } catch (err) {
    console.error('[Supabase] Erro inesperado ao testar conexão:', err)
  }
}

// 🔁 Executa o teste assim que o cliente é criado
testarConexaoSupabase()

// (Opcional) Reexecuta o teste a cada 30 segundos para monitorar status
setInterval(testarConexaoSupabase, 30000)