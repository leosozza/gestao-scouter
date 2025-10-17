// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Lendo as variáveis do .env via Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

// Validação básica
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ [Supabase] Variáveis ausentes. Confira o arquivo .env')
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

// (Opcional) Log de verificação
console.log('[Supabase] Client inicializado com URL:', SUPABASE_URL)