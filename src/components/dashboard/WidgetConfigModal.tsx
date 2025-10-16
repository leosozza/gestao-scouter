/**
 * Modal para configurar widgets do dashboard
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { DashboardWidget, DimensionType, MetricType, ChartType, DateGrouping } from '@/types/dashboard';
import { DIMENSION_LABELS, METRIC_LABELS, CHART_TYPE_LABELS, DATE_GROUPING_LABELS } from '@/types/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WidgetConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (widget: DashboardWidget) => void;
  initialWidget?: DashboardWidget;
}

export function WidgetConfigModal({ open, onOpenChange, onSave, initialWidget }: WidgetConfigModalProps) {
  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState<DimensionType>('scouter');
  const [metrics, setMetrics] = useState<MetricType[]>(['count_distinct_id']);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dateGrouping, setDateGrouping] = useState<DateGrouping>('day');
  const [limit, setLimit] = useState<number | undefined>(undefined);
  
  useEffect(() => {
    if (initialWidget) {
      setTitle(initialWidget.title);
      setDimension(initialWidget.dimension);
      setMetrics(initialWidget.metrics);
      setChartType(initialWidget.chartType);
      setDateGrouping(initialWidget.dateGrouping || 'day');
      setLimit(initialWidget.limit);
    } else {
      // Reset para valores padrão
      setTitle('');
      setDimension('scouter');
      setMetrics(['count_distinct_id']);
      setChartType('bar');
      setDateGrouping('day');
      setLimit(undefined);
    }
  }, [initialWidget, open]);
  
  const handleMetricToggle = (metric: MetricType, checked: boolean) => {
    if (checked) {
      setMetrics([...metrics, metric]);
    } else {
      setMetrics(metrics.filter(m => m !== metric));
    }
  };
  
  const handleSave = () => {
    const widget: DashboardWidget = {
      id: initialWidget?.id || `widget-${Date.now()}`,
      title: title || 'Novo Painel',
      dimension,
      metrics,
      chartType,
      dateGrouping: dimension === 'data' ? dateGrouping : undefined,
      limit,
      sortBy: metrics[0],
      sortOrder: 'desc'
    };
    
    onSave(widget);
    onOpenChange(false);
  };
  
  const availableMetrics: MetricType[] = [
    'count_distinct_id',
    'count_all',
    'sum_valor_ficha',
    'avg_valor_ficha',
    'count_com_foto',
    'count_confirmadas',
    'count_agendadas',
    'count_compareceu',
    'percent_com_foto',
    'percent_confirmadas',
    'percent_compareceu'
  ];
  
  const availableChartTypes: ChartType[] = ['table', 'bar', 'line', 'area', 'pie', 'kpi_card'];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialWidget ? 'Editar Painel' : 'Criar Novo Painel'}</DialogTitle>
          <DialogDescription>
            Configure as dimensões, métricas e visualização do seu painel
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Configuração Básica</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Painel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Desempenho por Scouter"
              />
            </div>
            
            {/* Dimensão */}
            <div className="space-y-2">
              <Label htmlFor="dimension">Agrupar por:</Label>
              <Select value={dimension} onValueChange={(val) => setDimension(val as DimensionType)}>
                <SelectTrigger id="dimension">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Agrupamento de Data */}
            {dimension === 'data' && (
              <div className="space-y-2">
                <Label htmlFor="dateGrouping">Agrupar data por:</Label>
                <Select value={dateGrouping} onValueChange={(val) => setDateGrouping(val as DateGrouping)}>
                  <SelectTrigger id="dateGrouping">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DATE_GROUPING_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Métricas */}
            <div className="space-y-2">
              <Label>Métricas:</Label>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-md p-3">
                {availableMetrics.map(metric => (
                  <div key={metric} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric}
                      checked={metrics.includes(metric)}
                      onCheckedChange={(checked) => handleMetricToggle(metric, checked as boolean)}
                    />
                    <Label
                      htmlFor={metric}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {METRIC_LABELS[metric]}
                    </Label>
                  </div>
                ))}
              </div>
              {metrics.length === 0 && (
                <p className="text-sm text-destructive">Selecione pelo menos uma métrica</p>
              )}
            </div>
            
            {/* Tipo de Gráfico */}
            <div className="space-y-2">
              <Label>Tipo de Visualização:</Label>
              <RadioGroup value={chartType} onValueChange={(val) => setChartType(val as ChartType)}>
                <div className="grid grid-cols-2 gap-3">
                  {availableChartTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={type} />
                      <Label htmlFor={type} className="font-normal cursor-pointer">
                        {CHART_TYPE_LABELS[type]}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Limite de Resultados */}
            <div className="space-y-2">
              <Label htmlFor="limit">Limitar resultados (opcional)</Label>
              <Input
                id="limit"
                type="number"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Ex: 10 (para mostrar top 10)"
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para mostrar todos os resultados
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={metrics.length === 0}>
            {initialWidget ? 'Atualizar' : 'Criar'} Painel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
