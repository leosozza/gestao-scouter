// Repositório para Dashboard - Dados do Supabase
// 
// ⚠️ FONTE ÚNICA: Tabela 'leads'
// ================================
// Este repositório busca dados exclusivamente da tabela 'leads' do Supabase.
// Todos os dashboards e visualizações devem usar esta fonte centralizada.
import { supabase } from '@/lib/supabase-helper';
import type { FichaDataPoint } from '@/types/ficha';

export interface DashboardDataResult {
  data: FichaDataPoint[];
  missingFields: string[];
}

/**
 * Busca dados do dashboard da tabela 'leads' com filtros
 * @param filters - Filtros de período, scouter e projeto
 * @returns Dados de leads para exibição em dashboard
 */
export async function getDashboardData(filters: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}): Promise<DashboardDataResult> {
  let query = supabase
    .from('leads')
    .select('*');

  // Aplicar filtros usando apenas 'criado' (coluna que existe)
  if (filters.start) {
    query = query.gte('criado', filters.start);
  }
  if (filters.end) {
    query = query.lte('criado', filters.end);
  }
  if (filters.scouter) {
    query = query.ilike('scouter', `%${filters.scouter}%`);
  }
  if (filters.projeto) {
    query = query.eq('projeto', filters.projeto);
  }

  // Ordenar apenas por 'criado' (coluna que existe)
  const { data, error } = await query.order('criado', { ascending: false });

  if (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw error;
  }

  return {
    data: (data || []) as FichaDataPoint[],
    missingFields: []
  };
}