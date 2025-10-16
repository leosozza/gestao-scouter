// Repositório para Dashboard - Dados do Supabase
import { supabase } from '@/integrations/supabase/client';
import { detectMissingFields } from '@/utils/fieldValidator';
import type { FichaDataPoint } from '@/types/ficha';

export interface DashboardDataResult {
  data: FichaDataPoint[];
  missingFields: string[];
}

export async function getDashboardData(filters: { 
  start?: string; 
  end?: string; 
  scouter?: string; 
  projeto?: string 
}): Promise<DashboardDataResult> {
  let query = supabase
    .from('fichas')
    .select('*')
    .eq('deleted', false);

  // Aplicar filtros
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
    query = query.ilike('projeto', `%${filters.projeto}%`);
  }

  const { data, error } = await query.order('criado', { ascending: false });

  if (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw error;
  }

  // Detectar campos ausentes
  const missingFields = detectMissingFields(data || [], 'fichas');

  return {
    data: (data || []) as FichaDataPoint[],
    missingFields
  };
}