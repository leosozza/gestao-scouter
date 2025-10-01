// @ts-nocheck
import { getDataSource } from './datasource';
import { supabase } from '@/integrations/supabase/client';
import { normalize } from '@/utils/normalize';

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

// Internal interfaces for processing
interface ScouterFromTab {
  nome?: string;
  tier?: string;
  status?: string;
  meta_semanal?: number;
  ativo?: boolean;
}

interface FichaRecord {
  status_normalizado?: string;
  valor_por_ficha_num?: number;
  [key: string]: unknown;
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

// Função para buscar dados do Supabase apenas para Google Sheets agora  
async function fetchScoutersFromSupabase(): Promise<ScouterData[]> {
  // Com a nova estrutura, vamos usar apenas Google Sheets
  return fetchScoutersFromSheets();
}

async function fetchScoutersFromSheets(): Promise<ScouterData[]> {
  try {
    const { GoogleSheetsService } = await import('@/services/googleSheetsService');
    
    // First, try to fetch from the dedicated Scouters tab
    const scoutersFromTab = await GoogleSheetsService.fetchScouters();
    
    // Also fetch fichas for enrichment and fallback
    const fichas = await GoogleSheetsService.fetchFichas();
    
    // If we have data from the Scouters tab, use it as the primary source
    if (scoutersFromTab.length > 0) {
      console.log(`scoutersRepo: Using data from Scouters tab (${scoutersFromTab.length} scouters found)`);
      return enrichScoutersWithFichasData(scoutersFromTab, fichas);
    }
    
    // Fallback: derive scouters from fichas grouping
    console.log('scoutersRepo: Scouters tab empty, falling back to deriving from fichas');
    return deriveScoutersFromFichas(fichas);
  } catch (error) {
    console.error('Error fetching scouters from Sheets:', error);
    return [];
  }
}

// New function to enrich scouter data with fichas statistics
function enrichScoutersWithFichasData(scoutersFromTab: ScouterFromTab[], fichas: FichaRecord[]): ScouterData[] {
  console.log(`scoutersRepo: Enriching ${scoutersFromTab.length} scouters with fichas data from ${fichas.length} fichas`);
  
  // Group fichas by scouter for statistics
  const fichasByScouterMap = new Map<string, FichaRecord[]>();
  
  fichas.forEach(ficha => {
    const getNomeScouter = (row: Record<string, unknown>) =>
      normalize(
        row["Gestão de Scouter"] ??
        row["Scouter"] ??
        row["Gestão do Scouter"] ??
        row["Gestao de Scouter"] ??
        row["Gestão de  Scouter"]
      );
    const scouterName = getNomeScouter(ficha);
    
    if (scouterName) {
      if (!fichasByScouterMap.has(scouterName)) {
        fichasByScouterMap.set(scouterName, []);
      }
      fichasByScouterMap.get(scouterName)!.push(ficha);
    }
  });
  
  console.log(`scoutersRepo: Grouped fichas into ${fichasByScouterMap.size} unique scouter names`);
  
  // Map scouters from tab with fichas data
  const result = scoutersFromTab.map((scouter, index) => {
    const scouterName = normalize(scouter.nome || 'Sem Nome');
    const scouterFichas = fichasByScouterMap.get(scouterName) || [];
    
    // Log first few matches for debugging
    if (index < 3) {
      console.log(`scoutersRepo: Scouter "${scouterName}" has ${scouterFichas.length} fichas, active=${scouter.ativo}`);
    }
    
    const totalFichas = scouterFichas.length;
    const convertedFichas = scouterFichas.filter(f => f.status_normalizado === 'Confirmado').length;
    const conversionRate = totalFichas > 0 ? (convertedFichas / totalFichas) * 100 : 0;
    
    // Determine performance status based on conversion rate
    let performanceStatus = 'Normal';
    if (conversionRate >= 80) performanceStatus = 'Excelente';
    else if (conversionRate >= 60) performanceStatus = 'Bom';
    else if (conversionRate < 40) performanceStatus = 'Precisa Melhorar';
    
    const totalValue = scouterFichas.reduce((sum, f) => sum + (f.valor_por_ficha_num || 0), 0);
    
    return {
      id: `scouter-${index}`,
      scouter_name: scouterName,
      tier_name: scouter.tier || 'Scouter Pleno',
      weekly_goal: scouter.meta_semanal || 50,
      fichas_value: totalValue,
      total_fichas: totalFichas,
      converted_fichas: convertedFichas,
      conversion_rate: conversionRate,
      performance_status: performanceStatus,
      active: scouter.ativo !== undefined ? scouter.ativo : true
    };
  });
  
  const activeCount = result.filter(s => s.active).length;
  console.log(`scoutersRepo: Enriched ${result.length} scouters (${activeCount} active, ${result.length - activeCount} inactive)`);
  
  return result;
}

// Existing function to derive scouters from fichas (kept as fallback)
function deriveScoutersFromFichas(fichas: FichaRecord[]): ScouterData[] {
  // Group fichas by scouter
  const scouterMap = new Map<string, { fichas: FichaRecord[]; tier_name: string; weekly_goal: number }>();
  
  fichas.forEach(ficha => {
    const getNomeScouter = (row: Record<string, unknown>) =>
      normalize(
        row["Gestão de Scouter"] ??
        row["Scouter"] ??
        row["Gestão do Scouter"] ??
        row["Gestao de Scouter"] ??
        row["Gestão de  Scouter"]
      );
    const scouterName = getNomeScouter(ficha) || 'Sem Scouter';
    
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
    const convertedFichas = data.fichas.filter((f: FichaRecord) => f.status_normalizado === 'Confirmado').length;
    const conversionRate = totalFichas > 0 ? (convertedFichas / totalFichas) * 100 : 0;
    
    // Determine performance status based on conversion rate
    let performanceStatus = 'Normal';
    if (conversionRate >= 80) performanceStatus = 'Excelente';
    else if (conversionRate >= 60) performanceStatus = 'Bom';
    else if (conversionRate < 40) performanceStatus = 'Precisa Melhorar';
    
    const totalValue = data.fichas.reduce((sum: number, f: FichaRecord) => sum + (f.valor_por_ficha_num || 0), 0);
    
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
}