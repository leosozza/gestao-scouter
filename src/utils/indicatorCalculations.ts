import type { IndicatorConfig } from '@/types/indicator';

export function calculateIndicatorValue(
  data: any[],
  config: IndicatorConfig
): number {
  if (!data || data.length === 0) return 0;

  // Apply filters if present
  let filteredData = data;
  if (config.filter_condition?.date_filter === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filteredData = data.filter((item) => {
      const itemDate = new Date(item.criado_em || item.criado).toISOString().split('T')[0];
      return itemDate === today;
    });
  }

  const values = filteredData
    .map((item) => item[config.source_column])
    .filter((v) => v !== null && v !== undefined);

  switch (config.aggregation) {
    case 'count':
      return values.length;

    case 'count_distinct':
      return new Set(values).size;

    case 'sum':
      return values.reduce((sum, val) => {
        const num = parseFloat(String(val).replace(',', '.'));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

    case 'avg': {
      const sum = values.reduce((s, val) => {
        const num = parseFloat(String(val).replace(',', '.'));
        return s + (isNaN(num) ? 0 : num);
      }, 0);
      return values.length > 0 ? sum / values.length : 0;
    }

    case 'min': {
      const nums = values.map((v) => parseFloat(String(v).replace(',', '.'))).filter((n) => !isNaN(n));
      return nums.length > 0 ? Math.min(...nums) : 0;
    }

    case 'max': {
      const nums = values.map((v) => parseFloat(String(v).replace(',', '.'))).filter((n) => !isNaN(n));
      return nums.length > 0 ? Math.max(...nums) : 0;
    }

    default:
      return 0;
  }
}
