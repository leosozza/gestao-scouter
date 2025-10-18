// Repositório para Dashboard - Dados do Supabase
// 
// ⚠️ FONTE ÚNICA: Tabela 'fichas'
// ================================
// Este repositório busca dados exclusivamente da tabela 'fichas' do Supabase.
// Todos os dashboards e visualizações devem usar esta fonte centralizada.
import { supabase } from '@/lib/supabase-helper';
import type { FichaDataPoint } from '@/types/ficha';

export interface DashboardDataResult {
  data: FichaDataPoint[];
  missingFields: string[];
}

/**
 * Busca dados do dashboard da tabela 'fichas' com filtros
 * @param filters - Filtros de período, scouter e projeto
 * @returns Dados de fichas para exibição em dashboard
 */
export async function getDashboardData(filters: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}): Promise<DashboardDataResult> {
  let query = supabase
    .from('fichas')
    .select('*');

  // Aplicar filtros com fallback para criado e created_at
  if (filters.start) {
    query = query.or(`criado.gte.${filters.start},created_at.gte.${filters.start}`);
  }
  if (filters.end) {
    query = query.or(`criado.lte.${filters.end},created_at.lte.${filters.end}`);
  }
  if (filters.scouter) {
    query = query.ilike('scouter', `%${filters.scouter}%`);
  }
  if (filters.projeto) {
    query = query.eq('projeto', filters.projeto);
  }

  // Order by criado or created_at with fallback support
  // Use Postgres COALESCE to handle both columns in a single query
  let data, error;
  try {
    // First attempt: order by 'criado' (most common case)
    const result = await query.order('criado', { ascending: false });
    data = result.data;
    error = result.error;
    
    // If error indicates column doesn't exist, try created_at
    if (error && error.message?.includes('criado')) {
      console.warn('Column "criado" not found, falling back to "created_at"');
      const fallbackResult = await query.order('created_at', { ascending: false });
      data = fallbackResult.data;
      error = fallbackResult.error;
    }
  } catch (e) {
    console.warn('Error ordering by "criado", trying "created_at":', e);
    try {
      const result = await query.order('created_at', { ascending: false });
      data = result.data;
      error = result.error;
    } catch (fallbackError) {
      console.error('Both ordering attempts failed:', fallbackError);
      throw fallbackError;
    }
  }

  if (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw error;
  }

  return {
    data: (data || []) as FichaDataPoint[],
    missingFields: []
  };
}