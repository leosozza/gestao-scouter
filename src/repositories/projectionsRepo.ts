import { getDataSource } from './datasource';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectionData {
  scouter_name: string;
  semana_futura: number;
  semana_label: string;
  weekly_goal: number;
  tier_name: string;
  projecao_conservadora: number;
  projecao_provavel: number;
  projecao_agressiva: number;
  projecao_historica: number;
}

export async function getProjectionData(): Promise<ProjectionData[]> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchProjectionsFromSupabase();
  } else {
    return fetchProjectionsFromSheets();
  }
}

async function fetchProjectionsFromSupabase(): Promise<ProjectionData[]> {
  try {
    const { data, error } = await supabase
      .from('vw_projecao_scouter')
      .select('*')
      .order('scouter_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching projections from Supabase:', error);
    return [];
  }
}

async function fetchProjectionsFromSheets(): Promise<ProjectionData[]> {
  try {
    const { GoogleSheetsService } = await import('@/services/googleSheetsService');
    const fichas = await GoogleSheetsService.fetchFichas();
    
    // Group fichas by scouter to calculate projections
    const scouterData = new Map();
    
    fichas.forEach(ficha => {
      const scouter = ficha['Gestão de Scouter'] || ficha['Primeiro nome'] || 'Desconhecido';
      if (!scouterData.has(scouter)) {
        scouterData.set(scouter, {
          fichas: [],
          weekly_goal: 50, // Default goal
          tier_name: 'Scouter Pleno' // Default tier
        });
      }
      scouterData.get(scouter).fichas.push(ficha);
    });
    
    // Calculate projections based on historical data
    return Array.from(scouterData.entries()).map(([scouter_name, data]) => {
      const totalFichas = data.fichas.length;
      const convertedFichas = data.fichas.filter(f => f.status_normalizado === 'Confirmado').length;
      const conversionRate = totalFichas > 0 ? (convertedFichas / totalFichas) : 0;
      
      // Simple projection logic based on recent performance
      const baseProjection = Math.max(data.weekly_goal * 0.8, totalFichas * 0.2);
      
      return {
        scouter_name,
        semana_futura: 1,
        semana_label: 'Sem+1',
        weekly_goal: data.weekly_goal,
        tier_name: data.tier_name,
        projecao_conservadora: Math.round(baseProjection * 0.8),
        projecao_provavel: Math.round(baseProjection),
        projecao_agressiva: Math.round(baseProjection * 1.2),
        projecao_historica: totalFichas
      };
    });
  } catch (error) {
    console.error('Error fetching projections from Sheets:', error);
    return [];
  }
}