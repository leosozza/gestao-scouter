// Repositório para Scouters - Dados do Supabase
import { supabase } from '@/integrations/supabase/client';
import { detectMissingFields } from '@/utils/fieldValidator';
import type { FichaDataPoint } from '@/types/ficha';

export interface ScouterData {
  id: string;
  scouter_name: string;
  tier_name: string;
  weekly_goal: number;
  fichas_value: number;
  total_fichas: number;
  converted_fichas: number;
  conversion_rate: number;
  taxaConversao: number;
  qualityScore: number;
  performance_status: string;
  status: string;
  active: boolean;
}

export interface ScouterSummary {
  totalScouters: number;
  activeScouters: number;
  totalFichas: number;
  averageConversion: number;
}

export interface ScouterDataResult {
  data: ScouterData[];
  missingFields: string[];
}

export async function getScoutersData(): Promise<ScouterData[]> {
  const result = await fetchScoutersFromSupabase();
  return result.data;
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

async function fetchScoutersFromSupabase(): Promise<ScouterDataResult> {
  try {
    // Buscar scouter_profiles e fichas do Supabase
    const { data: profiles, error: profilesError } = await supabase
      .from('scouter_profiles')
      .select('*')
      .eq('ativo', true);
    
    if (profilesError) throw profilesError;

    const { data: fichas, error: fichasError } = await supabase
      .from('leads')
      .select('*')
      .or('deleted.is.false,deleted.is.null');
    
    if (fichasError) throw fichasError;

    // Agrupar fichas por scouter
    const fichasByScouter = new Map<string, FichaDataPoint[]>();
    
    for (const ficha of (fichas || [])) {
      const scouterName = ficha.scouter?.trim();
      if (scouterName) {
        if (!fichasByScouter.has(scouterName)) {
          fichasByScouter.set(scouterName, []);
        }
        fichasByScouter.get(scouterName)!.push(ficha as FichaDataPoint);
      }
    }

    // Converter profiles em ScouterData
    const scoutersData: ScouterData[] = [];
    
    for (const profile of (profiles || [])) {
      const scouterFichas = fichasByScouter.get(profile.nome) || [];
      const totalFichas = scouterFichas.length;
      const convertedFichas = scouterFichas.filter(f => 
        f.confirmado === 'Sim' || f.compareceu === 'Sim'
      ).length;
      const conversionRate = totalFichas > 0 ? (convertedFichas / totalFichas) * 100 : 0;
      
      // Calcular tier baseado em performance
      const tierName = getTierFromFichas(totalFichas);
      const weeklyGoal = getWeeklyGoalFromTier(tierName);
      
      scoutersData.push({
        id: profile.id.toString(),
        scouter_name: profile.nome,
        tier_name: tierName,
        weekly_goal: weeklyGoal,
        fichas_value: totalFichas,
        total_fichas: totalFichas,
        converted_fichas: convertedFichas,
        conversion_rate: conversionRate,
        taxaConversao: conversionRate,
        qualityScore: calculateQualityScore(scouterFichas),
        performance_status: getPerformanceStatus(conversionRate),
        status: profile.ativo ? 'ativo' : 'inativo',
        active: profile.ativo
      });
    }

    // Detectar campos ausentes
    const missingFields = detectMissingFields(profiles || [], 'scouter_profiles');

    return {
      data: scoutersData,
      missingFields
    };
  } catch (error) {
    console.error('Error fetching scouters from Supabase:', error);
    return {
      data: [],
      missingFields: []
    };
  }
}

function getTierFromFichas(totalFichas: number): string {
  if (totalFichas >= 80) return 'Scouter Coach Bronze';
  if (totalFichas >= 60) return 'Scouter Premium';
  if (totalFichas >= 40) return 'Scouter Pleno';
  return 'Scouter Iniciante';
}

function getWeeklyGoalFromTier(tier: string): number {
  if (tier.includes('Coach')) return 90;
  if (tier.includes('Premium')) return 80;
  if (tier.includes('Pleno')) return 60;
  return 40;
}

function getPerformanceStatus(conversionRate: number): string {
  if (conversionRate >= 90) return 'excelente';
  if (conversionRate >= 75) return 'bom';
  if (conversionRate >= 60) return 'regular';
  return 'baixo';
}

function calculateQualityScore(fichas: FichaDataPoint[]): number {
  if (fichas.length === 0) return 0;
  
  let score = 0;
  const weights = {
    hasPhoto: 10,
    hasEmail: 5,
    hasPhone: 5,
    confirmed: 20,
    attended: 30
  };
  
  for (const ficha of fichas) {
    if (ficha.foto || ficha.cadastro_existe_foto === 'Sim') score += weights.hasPhoto;
    if (ficha.email) score += weights.hasEmail;
    if (ficha.telefone) score += weights.hasPhone;
    if (ficha.confirmado === 'Sim') score += weights.confirmed;
    if (ficha.compareceu === 'Sim') score += weights.attended;
  }
  
  const maxScore = fichas.length * (weights.hasPhoto + weights.hasEmail + weights.hasPhone + weights.confirmed + weights.attended);
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}
