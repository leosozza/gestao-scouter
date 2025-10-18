// Temporary wrapper to bypass TypeScript errors until migrations are run
import { supabase as baseSupabase } from '@/integrations/supabase/client';

// Get Supabase URL from environment variable directly since supabaseUrl is protected
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Log Supabase connection initialization
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
console.log('🔌 [Supabase] Inicializando cliente Supabase');
console.log('📡 [Supabase] URL:', SUPABASE_URL);
console.log('🔑 [Supabase] Cliente configurado com persistência de sessão');

// Test connection on initialization
(async () => {
  try {
    console.log('🧪 [Supabase] Testando conexão...');
    
    // Get count of all records in fichas table
    const { data, error, count } = await baseSupabase
      .from('fichas')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ [Supabase] Erro no teste de conexão:', error);
    } else {
      console.log('✅ [Supabase] Conexão estabelecida com sucesso');
      console.log(`📊 [Supabase] Total de registros na tabela "fichas": ${count ?? 0}`);
      
      if (count === 0) {
        console.warn('⚠️ [Supabase] A tabela "fichas" está VAZIA!');
        console.warn('💡 [Supabase] Para adicionar dados de teste, execute no Supabase SQL Editor:');
        console.warn(`
INSERT INTO fichas (nome, scouter, projeto, etapa, criado) VALUES
  ('João Silva', 'Maria Santos', 'Projeto Alpha', 'Contato', NOW()),
  ('Ana Costa', 'Pedro Lima', 'Projeto Beta', 'Agendado', NOW() - INTERVAL '1 day');
        `);
      }
    }
  } catch (err) {
    console.error('❌ [Supabase] Exceção ao testar conexão:', err);
  }
})();

export const supabase = baseSupabase as any;
