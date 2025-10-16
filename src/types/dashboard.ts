/**
 * Tipos para o Dashboard Self-Service
 * Permite aos usuários criar painéis customizáveis
 */

export type DimensionType = 
  | 'scouter'         // Agrupamento por scouter
  | 'projeto'         // Agrupamento por projeto
  | 'data'            // Agrupamento por data (dia/semana/mês)
  | 'supervisor'      // Agrupamento por supervisor
  | 'localizacao'     // Agrupamento por localização
  | 'etapa'           // Agrupamento por etapa do funil
  | 'tabulacao'       // Agrupamento por tabulação
  | 'ficha_confirmada'; // Agrupamento por status de confirmação

export type MetricType = 
  | 'count_distinct_id'       // COUNT(DISTINCT id)
  | 'count_all'               // COUNT(*)
  | 'sum_valor_ficha'         // SUM(valor_ficha)
  | 'avg_valor_ficha'         // AVG(valor_ficha)
  | 'count_com_foto'          // COUNT(CASE WHEN cadastro_existe_foto = 'SIM')
  | 'count_confirmadas'       // COUNT(CASE WHEN ficha_confirmada = 'Confirmada')
  | 'count_agendadas'         // COUNT(CASE WHEN agendado = '1')
  | 'count_compareceu'        // COUNT(CASE WHEN compareceu = '1')
  | 'percent_com_foto'        // (count_com_foto / count_all) * 100
  | 'percent_confirmadas'     // (count_confirmadas / count_all) * 100
  | 'percent_compareceu';     // (count_compareceu / count_agendadas) * 100

export type ChartType = 
  | 'table'           // Tabela
  | 'bar'             // Gráfico de barras
  | 'line'            // Gráfico de linhas
  | 'pie'             // Gráfico de pizza
  | 'kpi_card'        // Card de KPI
  | 'area';           // Gráfico de área

export type DateGrouping = 'day' | 'week' | 'month' | 'year';

export interface WidgetFilters {
  dataInicio?: string;
  dataFim?: string;
  scouter?: string[];
  projeto?: string[];
  supervisor?: string[];
  etapa?: string[];
}

export interface DashboardWidget {
  id: string;
  title: string;
  dimension: DimensionType;
  metrics: MetricType[];
  chartType: ChartType;
  filters?: WidgetFilters;
  dateGrouping?: DateGrouping; // Para dimensão 'data'
  limit?: number; // Limitar resultados (ex: top 10 scouters)
  sortBy?: MetricType; // Ordenar por métrica específica
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardConfig {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Labels amigáveis para a UI
export const DIMENSION_LABELS: Record<DimensionType, string> = {
  scouter: 'Scouter',
  projeto: 'Projeto',
  data: 'Data',
  supervisor: 'Supervisor',
  localizacao: 'Localização',
  etapa: 'Etapa',
  tabulacao: 'Tabulação',
  ficha_confirmada: 'Status de Confirmação'
};

export const METRIC_LABELS: Record<MetricType, string> = {
  count_distinct_id: 'Quantidade de Fichas',
  count_all: 'Total de Registros',
  sum_valor_ficha: 'Valor Total',
  avg_valor_ficha: 'Valor Médio',
  count_com_foto: 'Fichas com Foto',
  count_confirmadas: 'Fichas Confirmadas',
  count_agendadas: 'Fichas Agendadas',
  count_compareceu: 'Comparecimentos',
  percent_com_foto: '% com Foto',
  percent_confirmadas: '% Confirmadas',
  percent_compareceu: '% Comparecimento'
};

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  table: 'Tabela',
  bar: 'Gráfico de Barras',
  line: 'Gráfico de Linhas',
  pie: 'Gráfico de Pizza',
  kpi_card: 'Card KPI',
  area: 'Gráfico de Área'
};

export const DATE_GROUPING_LABELS: Record<DateGrouping, string> = {
  day: 'Por Dia',
  week: 'Por Semana',
  month: 'Por Mês',
  year: 'Por Ano'
};
