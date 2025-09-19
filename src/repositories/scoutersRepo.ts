import { getDataSource } from './datasource';
import { supabase } from '@/integrations/supabase/client';

export interface ScouterData {
  id: string;
  scouter_name: string;
  tier_name: string;
  weekly_goal: number;
  fichas_value: number;
  total_fichas: number;
  converted_fichas: number;
  conversion_rate: number;
  performance_status: string;
  active: boolean;
}

export interface ScouterSummary {
  totalScouters: number;
  activeScouters: number;
  totalFichas: number;
  averageConversion: number;
}

export async function getScoutersData(): Promise<ScouterData[]> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchScoutersFromSupabase();
  } else {
    return fetchScoutersFromSheets();
  }
}

export async function getScoutersSummary(): Promise<ScouterSummary> {
  const scoutersData = await getScoutersData();
  
  const totalScouters = scoutersData.length;
  const activeScouters = scoutersData.filter(s => s.active).length;
  const totalFichas = scoutersData.reduce((sum, s) => sum + s.total_fichas, 0);
  const averageConversion = scoutersData.length > 0 
    ? scoutersData.reduce((sum, s) => sum + s.conversion_rate, 0) / scoutersData.length 
    : 0;
  
  return {
    totalScouters,
    activeScouters,
    totalFichas,
    averageConversion
  };
}

async function fetchScoutersFromSupabase(): Promise<ScouterData[]> {
  try {
    const { data, error } = await supabase
      .from('scouter_profiles')
      .select(`
        *,
        scouter_tiers (tier_name)
      `);
    
    if (error) throw error;
    
    return (data || []).map(scouter => ({
      id: scouter.id,
      scouter_name: scouter.scouter_name,
      tier_name: scouter.scouter_tiers?.tier_name || 'Scouter Pleno',
      weekly_goal: scouter.weekly_goal,
      fichas_value: Number(scouter.fichas_value),
      total_fichas: 0, // Would need to calculate from leads
      converted_fichas: 0, // Would need to calculate from leads
      conversion_rate: 0, // Would need to calculate from leads
      performance_status: 'Normal',
      active: scouter.active
    }));
  } catch (error) {
    console.error('Error fetching scouters from Supabase:', error);
    return [];
  }
}

async function fetchScoutersFromSheets(): Promise<ScouterData[]> {
  try {
    const { GoogleSheetsService } = await import('@/services/googleSheetsService');
    const fichas = await GoogleSheetsService.fetchFichas();
    
    // Group fichas by scouter
    const scouterMap = new Map();
    
    fichas.forEach(ficha => {
      const scouterName = ficha['Gestão de Scouter'] || ficha['Primeiro nome'] || 'Desconhecido';
      
      if (!scouterMap.has(scouterName)) {
        scouterMap.set(scouterName, {
          fichas: [],
          tier_name: 'Scouter Pleno', // Default tier
          weekly_goal: 50 // Default goal
        });
      }
      
      scouterMap.get(scouterName).fichas.push(ficha);
    });
    
    // Convert to ScouterData format
    return Array.from(scouterMap.entries()).map(([scouterName, data], index) => {
      const totalFichas = data.fichas.length;
      const convertedFichas = data.fichas.filter(f => f.status_normalizado === 'Confirmado').length;
      const conversionRate = totalFichas > 0 ? (convertedFichas / totalFichas) * 100 : 0;
      
      // Determine performance status based on conversion rate
      let performanceStatus = 'Normal';
      if (conversionRate >= 80) performanceStatus = 'Excelente';
      else if (conversionRate >= 60) performanceStatus = 'Bom';
      else if (conversionRate < 40) performanceStatus = 'Precisa Melhorar';
      
      const totalValue = data.fichas.reduce((sum, f) => sum + (f.valor_por_ficha_num || 0), 0);
      
      return {
        id: `scouter-${index}`,
        scouter_name: scouterName,
        tier_name: data.tier_name,
        weekly_goal: data.weekly_goal,
        fichas_value: totalValue,
        total_fichas: totalFichas,
        converted_fichas: convertedFichas,
        conversion_rate: conversionRate,
        performance_status: performanceStatus,
        active: true
      };
    });
  } catch (error) {
    console.error('Error fetching scouters from Sheets:', error);
    return [];
  }
}