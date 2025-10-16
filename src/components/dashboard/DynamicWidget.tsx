/**
 * Componente que renderiza um widget dinâmico baseado em sua configuração
 */

import { useQuery } from '@tanstack/react-query';
import { executeDashboardQuery } from '@/services/dashboardQueryService';
import type { DashboardWidget } from '@/types/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
// Charts will be implemented later
import { SimpleDataTable } from '@/components/shared/SimpleDataTable';
import { DIMENSION_LABELS, METRIC_LABELS } from '@/types/dashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart as LineChartIcon, Table2, PieChart, FileText, AreaChart } from 'lucide-react';

interface DynamicWidgetProps {
  config: DashboardWidget;
  onEdit?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
}

export function DynamicWidget({ config, onEdit, onDelete }: DynamicWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-widget', config.id, config],
    queryFn: () => executeDashboardQuery(config),
    refetchInterval: 60000 // Atualizar a cada 1 minuto
  });
  
  const getChartIcon = () => {
    switch (config.chartType) {
      case 'bar': return <BarChart3 className="h-4 w-4" />;
      case 'line': return <LineChartIcon className="h-4 w-4" />;
      case 'area': return <AreaChart className="h-4 w-4" />;
      case 'pie': return <PieChart className="h-4 w-4" />;
      case 'table': return <Table2 className="h-4 w-4" />;
      case 'kpi_card': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };
  
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {DIMENSION_LABELS[config.dimension]} • {config.metrics.map(m => METRIC_LABELS[m]).join(', ')}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(config)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(config.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar dados: {error.message}
            </AlertDescription>
          </Alert>
        )}
        
        {!isLoading && !error && data && (
          <WidgetContent config={config} data={data} />
        )}
      </CardContent>
    </Card>
  );
}

interface WidgetContentProps {
  config: DashboardWidget;
  data: any[];
}

function WidgetContent({ config, data }: WidgetContentProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado encontrado para os filtros selecionados
      </div>
    );
  }
  
  switch (config.chartType) {
    case 'table':
      return <TableView config={config} data={data} />;
    
    case 'bar':
    case 'line':
    case 'area':
    case 'pie':
      return (
        <div className="text-center py-8 text-muted-foreground">
          Gráficos serão implementados em breve. Use tabela ou KPI por enquanto.
        </div>
      );
    
    case 'kpi_card':
      return <KPIView config={config} data={data} />;
    
    default:
      return (
        <div className="text-center py-8 text-muted-foreground">
          Tipo de gráfico não implementado: {config.chartType}
        </div>
      );
  }
}

function TableView({ config, data }: WidgetContentProps) {
  const columns = [
    {
      id: config.dimension,
      header: DIMENSION_LABELS[config.dimension],
      accessorKey: config.dimension,
      cell: ({ row }: any) => {
        const value = row.getValue(config.dimension);
        return <div className="font-medium">{value || 'N/A'}</div>;
      }
    },
    ...config.metrics.map(metric => ({
      id: metric,
      header: METRIC_LABELS[metric],
      accessorKey: metric,
      cell: ({ row }: any) => {
        const value = row.getValue(metric);
        // Formatar valores percentuais
        if (metric.startsWith('percent_')) {
          return <div>{typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A'}</div>;
        }
        // Formatar valores monetários
        if (metric.includes('valor')) {
          return <div>{typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}</div>;
        }
        return <div>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value || 'N/A'}</div>;
      }
    }))
  ];
  
  return <SimpleDataTable columns={columns} data={data} />;
}

function KPIView({ config, data }: WidgetContentProps) {
  // Para KPI, mostrar apenas o primeiro registro e primeira métrica
  const value = data[0]?.[config.metrics[0]];
  const metric = config.metrics[0];
  
  const formatValue = (val: number) => {
    if (metric.startsWith('percent_')) {
      return `${val.toFixed(1)}%`;
    }
    if (metric.includes('valor')) {
      return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return val.toLocaleString('pt-BR');
  };
  
  return (
    <div className="text-center py-8">
      <div className="text-5xl font-bold text-primary mb-2">
        {typeof value === 'number' ? formatValue(value) : 'N/A'}
      </div>
      <div className="text-sm text-muted-foreground">
        {METRIC_LABELS[metric]}
      </div>
    </div>
  );
}
