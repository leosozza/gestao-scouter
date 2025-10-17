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

  // Try ordering by 'criado' first, fallback to 'created_at' if error
  let data, error;
  try {
    const result = await query.order('criado', { ascending: false });
    data = result.data;
    error = result.error;
  } catch (e) {
    console.warn('Warning: Could not order by "criado", trying "created_at":', e);
    const result = await query.order('created_at', { ascending: false });
    data = result.data;
    error = result.error;
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