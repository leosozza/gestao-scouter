import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ALL_LEAD_FIELDS, CATEGORY_LABELS } from '@/config/leadFields';
import { useLeadColumnConfig } from '@/hooks/useLeadColumnConfig';
import { Search, RotateCcw } from 'lucide-react';

interface ColumnSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ColumnSelectorModal({ open, onOpenChange }: ColumnSelectorModalProps) {
  const [search, setSearch] = useState('');
  const {
    visibleColumns,
    toggleColumn,
    resetToDefault,
    selectAll,
    clearAll,
    canToggle,
    minColumns,
    maxColumns
  } = useLeadColumnConfig();

  const categories = Array.from(new Set(ALL_LEAD_FIELDS.map(f => f.category)));

  const filteredFields = ALL_LEAD_FIELDS.filter(field =>
    field.label.toLowerCase().includes(search.toLowerCase()) ||
    field.key.toLowerCase().includes(search.toLowerCase())
  );

  const groupedFields = categories.reduce((acc, category) => {
    acc[category] = filteredFields.filter(f => f.category === category);
    return acc;
  }, {} as Record<string, typeof ALL_LEAD_FIELDS>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Configurar Colunas da Lista de Leads</DialogTitle>
          <DialogDescription>
            Selecione quais campos deseja exibir na lista. Mínimo de {minColumns} e máximo de {maxColumns} colunas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          <div className="flex items-center justify-between">
            <Badge variant="outline">
              {visibleColumns.length} de {ALL_LEAD_FIELDS.length} campos selecionados
            </Badge>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={visibleColumns.length <= minColumns}
              >
                Limpar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={visibleColumns.length >= maxColumns}
              >
                Selecionar Máximo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Padrão
              </Button>
            </div>
          </div>

          {/* Field list */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {categories.map(category => {
                const fields = groupedFields[category];
                if (!fields || fields.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {fields.map(field => {
                        const isChecked = visibleColumns.includes(field.key);
                        const isMandatory = field.key === 'nome';
                        const canToggleField = canToggle(field.key);

                        return (
                          <div
                            key={field.key}
                            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent/50"
                          >
                            <Checkbox
                              id={field.key}
                              checked={isChecked}
                              onCheckedChange={() => toggleColumn(field.key)}
                              disabled={!canToggleField}
                            />
                            <label
                              htmlFor={field.key}
                              className="text-sm flex-1 cursor-pointer"
                            >
                              {field.label}
                              {isMandatory && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Aplicar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
