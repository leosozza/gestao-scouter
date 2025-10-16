import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IndicatorConfig } from '@/types/indicator';

interface IndicatorConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: IndicatorConfig | null;
  onSave: (config: Partial<IndicatorConfig>) => void;
  availableColumns: string[];
}

export function IndicatorConfigModal({
  open,
  onOpenChange,
  config,
  onSave,
  availableColumns,
}: IndicatorConfigModalProps) {
  const [title, setTitle] = useState('');
  const [sourceColumn, setSourceColumn] = useState('');
  const [aggregation, setAggregation] = useState<IndicatorConfig['aggregation']>('count');
  const [chartType, setChartType] = useState<IndicatorConfig['chart_type']>('number');
  const [format, setFormat] = useState<IndicatorConfig['format']>('number');

  useEffect(() => {
    if (config) {
      setTitle(config.title);
      setSourceColumn(config.source_column);
      setAggregation(config.aggregation);
      setChartType(config.chart_type);
      setFormat(config.format);
    }
  }, [config]);

  const handleSave = () => {
    if (!config) return;

    onSave({
      id: config.id,
      indicator_key: config.indicator_key,
      title,
      source_column: sourceColumn,
      aggregation,
      chart_type: chartType,
      format,
      position: config.position,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Indicador</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do indicador"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="column">Coluna de Dados</Label>
            <Select value={sourceColumn} onValueChange={setSourceColumn}>
              <SelectTrigger id="column">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aggregation">Função de Agregação</Label>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
              <SelectTrigger id="aggregation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">Contar</SelectItem>
                <SelectItem value="count_distinct">Contar Únicos</SelectItem>
                <SelectItem value="sum">Somar</SelectItem>
                <SelectItem value="avg">Média</SelectItem>
                <SelectItem value="min">Mínimo</SelectItem>
                <SelectItem value="max">Máximo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chartType">Tipo de Visualização</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
              <SelectTrigger id="chartType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="bar">Gráfico de Barras</SelectItem>
                <SelectItem value="line">Gráfico de Linha</SelectItem>
                <SelectItem value="pie">Gráfico de Pizza</SelectItem>
                <SelectItem value="donut">Gráfico de Rosca</SelectItem>
                <SelectItem value="progress">Barra de Progresso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="currency">Moeda (R$)</SelectItem>
                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
