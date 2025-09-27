import { supabase } from '@/integrations/supabase/client';

export interface ProjectionData {
  name: string; // Pode ser scouter ou projeto
  semana_futura: number;
  semana_label: string;
  weekly_goal: number;
  tier_name: string;
  projecao_conservadora: number;
  projecao_provavel: number;
  projecao_agressiva: number;
  projecao_historica: number;
  conversion_rate: number;  
  avg_weekly_fichas: number;
}

export type ProjectionType = 'scouter' | 'projeto';

export async function getProjectionData(type: ProjectionType = 'scouter'): Promise<ProjectionData[]> {
  try {
    return await fetchProjectionsFromSupabase(type);
  } catch (error) {
    console.error('Error fetching projections:', error);
    return [];
  }
}

async function fetchProjectionsFromSupabase(type: ProjectionType): Promise<ProjectionData[]> {
  try {
    // Buscar fichas dos últimos 30 dias para análise histórica
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: fichas, error } = await supabase
      .from('fichas')
      .select('*')
      .gte('criado', thirtyDaysAgo.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching fichas:', error);
      return [];
    }

    if (!fichas || fichas.length === 0) {
      return [];
    }

    // Agrupar por scouter ou projeto
    const groupedData = new Map();
    
    fichas.forEach(ficha => {
      const groupKey = type === 'scouter' 
        ? (ficha.scouter || 'Desconhecido')
        : (ficha.projetos || 'Sem Projeto');
        
      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          fichas: [],
          weeklyData: new Map() // Para calcular média semanal
        });
      }
      groupedData.get(groupKey).fichas.push(ficha);
      
      // Agrupar por semana para calcular performance semanal
      const weekKey = getWeekKey(ficha.criado);
      const weeklyData = groupedData.get(groupKey).weeklyData;
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      weeklyData.get(weekKey).push(ficha);
    });

    // Calcular projeções para cada item (scouter ou projeto)
    return Array.from(groupedData.entries()).map(([name, data]) => {
      const totalFichas = data.fichas.length;
      
      // Calcular taxa de confirmação
      const confirmedFichas = data.fichas.filter(f => f.confirmado === '1').length;
      const conversionRate = totalFichas > 0 ? (confirmedFichas / totalFichas) : 0;
      
      // Calcular média semanal
      const weeklyTotals = Array.from(data.weeklyData.values()).map((week: any[]) => week.length);
      const avgWeeklyFichas = weeklyTotals.length > 0 
        ? weeklyTotals.reduce((sum, count) => sum + count, 0) / weeklyTotals.length 
        : 0;
      
      // Determinar tier baseado na performance
      const tier_name = getTierFromPerformance(avgWeeklyFichas, conversionRate);
      const weekly_goal = getWeeklyGoalFromTier(tier_name);
      
      // Calcular projeções baseadas na tendência recente
      const recentWeeks = weeklyTotals.slice(-2); // Últimas 2 semanas
      const recentAvg = recentWeeks.length > 0 
        ? recentWeeks.reduce((sum, count) => sum + count, 0) / recentWeeks.length 
        : avgWeeklyFichas;
      
      // Base da projeção: combinação da média histórica com tendência recente
      const baseProjection = Math.max(
        (avgWeeklyFichas * 0.6) + (recentAvg * 0.4), // 60% histórico, 40% recente
        weekly_goal * 0.3 // Mínimo de 30% da meta
      );
      
      return {
        name,
        semana_futura: 1,
        semana_label: 'Sem+1',
        weekly_goal,
        tier_name,
        projecao_conservadora: Math.round(baseProjection * 0.75),
        projecao_provavel: Math.round(baseProjection),
        projecao_agressiva: Math.round(baseProjection * 1.3),
        projecao_historica: totalFichas,
        conversion_rate: Math.round(conversionRate * 100),
        avg_weekly_fichas: Math.round(avgWeeklyFichas)
      };
    });
  } catch (error) {
    console.error('Error in fetchProjectionsFromSupabase:', error);
    return [];
  }
}

// Função auxiliar para gerar chave da semana
function getWeekKey(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Tentar diferentes formatos de data
    let date: Date;
    
    if (dateString.includes('/')) {
      // Formato dd/mm/yyyy ou mm/dd/yyyy
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Assumir dd/mm/yyyy
        date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      } else {
        date = new Date(dateString);
      }
    } else {
      // Formato ISO ou outro
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return '';
    }
    
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Início da semana (domingo)
    return weekStart.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return '';
  }
}

// Função para determinar tier baseado na performance
function getTierFromPerformance(avgWeekly: number, conversionRate: number): string {
  const performance = avgWeekly * (1 + conversionRate); // Score combinado
  
  if (performance >= 80) return 'Diamante';
  if (performance >= 60) return 'Ouro';
  if (performance >= 40) return 'Prata';
  return 'Bronze';
}

// Função para obter meta semanal baseada no tier
function getWeeklyGoalFromTier(tier: string): number {
  const goals = {
    'Diamante': 100,
    'Ouro': 80,
    'Prata': 60,
    'Bronze': 40
  };
  return goals[tier] || 50;
}