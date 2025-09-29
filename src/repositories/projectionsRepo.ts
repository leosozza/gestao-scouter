import { supabase } from '@/integrations/supabase/client';
import { GoogleSheetsService } from '@/services/googleSheetsService';
import { normalize, normalizeUpper, toISODate, parseDDMMYYYY } from '@/utils/normalize';
import { getValorFichaFromRow, parseFichaValue } from '@/utils/values';

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

// New interfaces for linear projection
export interface LinearProjectionData {
  periodo: {
    inicio: string;
    fim: string;
    hoje_limite: string;
    dias_passados: number;
    dias_restantes: number;
    dias_totais: number;
  };
  realizado: {
    fichas: number;
    valor: number;
  };
  projetado_restante: {
    fichas: number;
    valor: number;
  };
  total_projetado: {
    fichas: number;
    valor: number;
  };
  serie_real: Array<{ dia: string; fichas: number; acumulado: number }>;
  serie_proj: Array<{ dia: string; fichas: number; acumulado: number }>;
  media_diaria: number;
  valor_medio_por_ficha: number;
}

export async function getProjectionData(type: ProjectionType = 'scouter', selectedFilter?: string): Promise<ProjectionData[]> {
  try {
    return await fetchProjectionsFromSupabase(type, selectedFilter);
  } catch (error) {
    console.error('Error fetching projections:', error);
    return [];
  }
}

type ProjecaoFiltro = { inicio: string; fim: string; scouter?: string; projeto?: string; valor_ficha_padrao?: number }

export async function fetchLinearProjection(p: ProjecaoFiltro): Promise<LinearProjectionData> {
  const S = new Date(p.inicio)
  const E = new Date(p.fim)
  const hoje = new Date()
  const To = new Date(Math.min(+E, +hoje))
  const toISO = (d: Date) => toISODate(d)
  const dtTo = toISO(To)

  // Busca do Sheets para ficar idêntico ao dashboard
  const rows = await GoogleSheetsService.fetchFichas()
  const scFil = normalizeUpper(p.scouter)
  const prFil = normalizeUpper(p.projeto)

  // filtro período + scouter/projeto
  const data = rows.filter((r: any) => {
    const rawData = r["Criado"] || r["Data_criacao_Ficha"] || r["Data"] || r["criado"]
    const iso = typeof rawData === "string" && rawData.includes("/")
      ? parseDDMMYYYY(rawData)
      : toISODate(new Date(rawData))
    if (!iso) return false
    if (iso < p.inicio || iso > p.fim) return false
    if (scFil && normalizeUpper(r["Gestão de Scouter"] ?? r["Scouter"] ?? r["Gestão do Scouter"]) !== scFil) return false
    if (prFil && normalizeUpper(r["Projetos Cormeciais"] ?? r["Projetos Comerciais"] ?? r["Projetos"] ?? r["Projeto"]) !== prFil) return false
    ;(r as any).__iso = iso
    return true
  })

  const realizadas = data.filter((r: any) => (r as any).__iso <= dtTo)
  const fichas_real = realizadas.length
  const valor_real = realizadas.reduce((acc: number, r: any) => acc + (getValorFichaFromRow(r) || 0), 0)

  const dias_passados  = Math.floor((+To - +S) / 86400000) + 1
  const dias_totais    = Math.floor((+E  - +S) / 86400000) + 1
  const dias_restantes = Math.max(0, dias_totais - dias_passados)

  const media_diaria = dias_passados > 0 ? fichas_real / dias_passados : 0
  const valor_medio_por_ficha = fichas_real > 0 ? (valor_real / fichas_real) : (p.valor_ficha_padrao ?? 0)

  const proj_restante_qtde  = Math.round(media_diaria * dias_restantes)
  const proj_restante_valor = +(proj_restante_qtde * valor_medio_por_ficha).toFixed(2)

  // séries para o gráfico
  const serie_real: Array<{ dia: string; fichas: number; acumulado: number }> = []
  const serie_proj: Array<{ dia: string; fichas: number; acumulado: number }> = []
  // acumulado diário realizado
  const mapCount: Record<string, number> = {}
  for (const r of realizadas) {
    const d = (r as any).__iso as string
    mapCount[d] = (mapCount[d] ?? 0) + 1
  }
  // construir série do início até To
  let cursor = new Date(S)
  let acc = 0
  while (cursor <= To) {
    const key = toISO(cursor)
    const fichasDia = mapCount[key] ?? 0
    acc += fichasDia
    serie_real.push({ dia: key, fichas: fichasDia, acumulado: acc })
    cursor = new Date(+cursor + 86400000)
  }
  // prolongamento linear To -> E
  const ultimo = acc
  let projAcc = ultimo
  let c2 = new Date(+To + 86400000)
  for (let i = 0; c2 <= E; i++, c2 = new Date(+c2 + 86400000)) {
    projAcc = Math.round(ultimo + media_diaria * (i + 1))
    serie_proj.push({ dia: toISO(c2), fichas: media_diaria, acumulado: projAcc })
  }

  return {
    periodo: { inicio: p.inicio, hoje_limite: dtTo, fim: p.fim, dias_passados, dias_restantes, dias_totais },
    realizado: { fichas: fichas_real, valor: +valor_real.toFixed(2) },
    projetado_restante: { fichas: proj_restante_qtde, valor: proj_restante_valor },
    total_projetado: { fichas: fichas_real + proj_restante_qtde, valor: +(valor_real + proj_restante_valor).toFixed(2) },
    media_diaria,
    valor_medio_por_ficha: +valor_medio_por_ficha.toFixed(2),
    serie_real,
    serie_proj
  }
}

export async function getAvailableFilters(): Promise<{ scouters: string[], projetos: string[] }> {
  try {
    const rows = await GoogleSheetsService.fetchFichas() // mesma fonte do dashboard
    const sc = new Set<string>()
    const pr = new Set<string>()
    for (const r of rows) {
      const scouter =
        r["Gestão de Scouter"] ??
        r["Scouter"] ??
        r["Gestão do Scouter"] ??
        r["Gestao de Scouter"] ??
        r["Gestão de  Scouter"]
      const projeto =
        r["Projetos Cormeciais"] ??
        r["Projetos Comerciais"] ??
        r["Projetos"] ??
        r["Projeto"]
      if (normalize(scouter)) sc.add(normalize(scouter))
      if (normalize(projeto)) pr.add(normalize(projeto))
    }
    return { scouters: Array.from(sc).sort(), projetos: Array.from(pr).sort() }
  } catch (e) {
    console.error("getAvailableFilters failed:", e)
    return { scouters: [], projetos: [] }
  }
}

async function fetchProjectionsFromSupabase(type: ProjectionType, selectedFilter?: string): Promise<ProjectionData[]> {
  try {
    // Buscar fichas dos últimos 30 dias para análise histórica
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let query = supabase
      .from('fichas')
      .select('*')
      .gte('criado', thirtyDaysAgo.toISOString().split('T')[0]);

    // Aplicar filtro específico se selecionado
    if (selectedFilter) {
      if (type === 'scouter') {
        query = query.eq('scouter', selectedFilter);
      } else {
        query = query.eq('projetos', selectedFilter);
      }
    }

    const { data: fichas, error } = await query;

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

// Helper functions for linear projection
function parseDate(dateString: string): string | null {
  if (!dateString) return null;
  
  try {
    let date: Date;
    
    if (dateString.includes('/')) {
      // Formato dd/mm/yyyy
      const parts = dateString.split('/');
      if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      } else {
        date = new Date(dateString);
      }
    } else {
      // Formato ISO ou outro
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return null;
  }
}

function generateDailySeries(
  startDate: Date, 
  endDate: Date, 
  fichas: any[], 
  type: 'real'
): Array<{ dia: string; fichas: number; acumulado: number }> {
  const series = [];
  const current = new Date(startDate);
  let acumulado = 0;
  
  // Group fichas by date
  const fichasByDate = fichas.reduce((acc: Record<string, number>, ficha: any) => {
    const dateKey = parseDate(ficha.criado);
    if (dateKey) {
      acc[dateKey] = (acc[dateKey] || 0) + 1;
    }
    return acc;
  }, {});
  
  while (current <= endDate) {
    const dateKey = current.toISOString().slice(0, 10);
    const dayFichas = fichasByDate[dateKey] || 0;
    acumulado += dayFichas;
    
    series.push({
      dia: dateKey,
      fichas: dayFichas,
      acumulado,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return series;
}

function generateProjectionSeries(
  startDate: Date,
  endDate: Date,
  mediaDiaria: number,
  serieReal: Array<{ dia: string; fichas: number; acumulado: number }>
): Array<{ dia: string; fichas: number; acumulado: number }> {
  const series = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // Start from next day
  
  let acumulado = serieReal.length > 0 ? serieReal[serieReal.length - 1].acumulado : 0;
  
  while (current <= endDate) {
    const dateKey = current.toISOString().slice(0, 10);
    const dayFichas = Math.round(mediaDiaria);
    acumulado += dayFichas;
    
    series.push({
      dia: dateKey,
      fichas: dayFichas,
      acumulado,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return series;
}