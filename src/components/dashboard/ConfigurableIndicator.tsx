import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import type { IndicatorConfig } from '@/types/indicator';

interface ConfigurableIndicatorProps {
  config: IndicatorConfig;
  value: number | string;
  onEdit: () => void;
}

export function ConfigurableIndicator({ config, value, onEdit }: ConfigurableIndicatorProps) {
  const formatValue = (val: number | string) => {
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('pt-BR').format(numValue);
    }
  };

  return (
    <Card className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onEdit}
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{formatValue(value)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {config.aggregation === 'count' && 'Total de registros'}
          {config.aggregation === 'count_distinct' && 'Valores únicos'}
          {config.aggregation === 'sum' && 'Soma total'}
          {config.aggregation === 'avg' && 'Média'}
          {config.aggregation === 'min' && 'Valor mínimo'}
          {config.aggregation === 'max' && 'Valor máximo'}
        </p>
        <p className="text-xs text-muted-foreground">
          Coluna: <span className="font-mono">{config.source_column}</span>
        </p>
      </CardContent>
    </Card>
  );
}
