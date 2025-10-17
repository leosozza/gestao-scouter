// Temporary wrapper to bypass TypeScript errors until migrations are run
import { supabase as baseSupabase } from '@/integrations/supabase/client';

// Log Supabase connection initialization
console.log('🔌 [Supabase] Inicializando cliente Supabase');
console.log('📡 [Supabase] URL:', baseSupabase.supabaseUrl);
console.log('🔑 [Supabase] Cliente configurado com persistência de sessão');

// Test connection on initialization
(async () => {
  try {
    console.log('🧪 [Supabase] Testando conexão...');
    const { data, error } = await baseSupabase
      .from('fichas')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ [Supabase] Erro no teste de conexão:', error);
    } else {
      console.log('✅ [Supabase] Conexão estabelecida com sucesso');
    }
  } catch (err) {
    console.error('❌ [Supabase] Exceção ao testar conexão:', err);
  }
})();

export const supabase = baseSupabase as any;
