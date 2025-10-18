// Repositório central para ler do Supabase LOCAL (espelho)
// 
// ⚠️ FONTE ÚNICA DE VERDADE: Tabela 'fichas' no Supabase LOCAL
// =============================================================
// Este repositório acessa a tabela 'fichas' no Supabase LOCAL, que é o espelho
// centralizado de todas as fichas/leads da aplicação.
// 
// A tabela 'fichas' sincroniza bidirecionalmente com TabuladorMax.
// TabuladorMax possui sua própria tabela 'leads' (não confundir com legacy local).
// 
// Nunca busque dados de (LEGACY/DEPRECATED):
// - Google Sheets diretamente (descontinuado)
// - Tabela 'leads' local (legacy - use 'fichas')
// - Tabela 'bitrix_leads' (apenas histórico)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!, 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

/**
 * Busca fichas da tabela 'fichas' do Supabase com filtros opcionais
 * @param filters - Filtros de data, scouter e projeto
 * @returns Array de fichas não deletadas
 */
export async function fetchFichasFromDB(filters?: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}) {
  let q = supabase
    .from("fichas")
    .select("id, scouter, projeto, criado, valor_ficha, raw, deleted")
    .or('deleted.is.false,deleted.is.null');
    
  // Add fallback for criado and created_at fields
  if (filters?.start) q = q.or(`criado.gte.${filters.start},created_at.gte.${filters.start}`);
  if (filters?.end)   q = q.or(`criado.lte.${filters.end},created_at.lte.${filters.end}`);
  if (filters?.scouter) q = q.eq("scouter", filters.scouter);
  if (filters?.projeto) q = q.eq("projeto", filters.projeto);
  
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}