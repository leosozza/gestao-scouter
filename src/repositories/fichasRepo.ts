// Repositório central para ler do Supabase LOCAL
// 
// ⚠️ FONTE ÚNICA DE VERDADE: Tabela 'leads' no Supabase LOCAL
// =============================================================
// Este repositório acessa a tabela 'leads' no Supabase LOCAL, que é a fonte
// centralizada de todas as fichas/leads da aplicação.
// 
// A tabela 'leads' sincroniza bidirecionalmente com TabuladorMax.
// TabuladorMax possui sua própria tabela 'leads'.
// 
// Nunca busque dados de (LEGACY/DEPRECATED):
// - Google Sheets diretamente (descontinuado)
// - Tabela 'fichas' (migrada para 'leads')
// - Tabela 'bitrix_leads' (apenas histórico)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!, 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

/**
 * Busca fichas da tabela 'leads' do Supabase com filtros opcionais
 * 
 * ⚠️ IMPORTANTE: Esta função busca EXCLUSIVAMENTE da tabela 'leads'
 * 
 * @param filters - Filtros de data, scouter e projeto
 * @returns Array de fichas não deletadas
 */
export async function fetchFichasFromDB(filters?: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}) {
  console.log('🔍 [fichasRepo] Buscando dados da tabela "leads"');
  console.log('🗂️  [fichasRepo] Filtros aplicados:', filters);
  
  let q = supabase
    .from("leads")
    .select("id, scouter, projeto, criado, valor_ficha, raw, deleted")
    .or('deleted.is.false,deleted.is.null'); // Filtrar apenas registros não-deletados
    
  // Use 'criado' (date field) from leads table
  if (filters?.start) {
    console.log('📅 [fichasRepo] Filtro data início:', filters.start);
    q = q.gte("criado", filters.start);
  }
  if (filters?.end) {
    console.log('📅 [fichasRepo] Filtro data fim:', filters.end);
    q = q.lte("criado", filters.end);
  }
  if (filters?.scouter) {
    console.log('👤 [fichasRepo] Filtro scouter:', filters.scouter);
    q = q.eq("scouter", filters.scouter);
  }
  if (filters?.projeto) {
    console.log('📁 [fichasRepo] Filtro projeto:', filters.projeto);
    q = q.eq("projeto", filters.projeto);
  }
  
  const { data, error } = await q;
  
  if (error) {
    console.error('❌ [fichasRepo] Erro ao buscar dados:', error);
    throw error;
  }
  
  console.log(`✅ [fichasRepo] ${data?.length || 0} registros retornados da tabela "leads"`);
  return data || [];
}