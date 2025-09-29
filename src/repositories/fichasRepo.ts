// Repositório central para ler do Supabase (espelho)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!, 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

export async function fetchFichasFromDB(filters?: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}) {
  let q = supabase
    .from("fichas")
    .select("id, scouter, projeto, criado, valor_ficha, raw, deleted")
    .eq("deleted", false);
    
  if (filters?.start) q = q.gte("criado", filters.start);
  if (filters?.end)   q = q.lte("criado", filters.end);
  if (filters?.scouter) q = q.eq("scouter", filters.scouter);
  if (filters?.projeto) q = q.eq("projeto", filters.projeto);
  
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}