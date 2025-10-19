
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import type { Ficha, Project } from "@/repositories/types";

interface FinancialFiltersProps {
  leads: Lead[];
  projetos: Project[];
  onFiltersChange: (filters: FinancialFilterState) => void;
}

export interface FinancialFilterState {
  dateRange?: DateRange;
  scouter: string;
  projeto: string;
}

export const FinancialFilters = ({ leads, projetos, onFiltersChange }: FinancialFiltersProps) => {
  const [filters, setFilters] = useState<FinancialFilterState>({
    scouter: '',
    projeto: ''
  });

  // Extrair scouters únicos das leads
  const scouters = Array.from(new Set(
    leads
      .map(f => f['Gestão de Scouter'])
      .filter(Boolean)
  )).sort();

  // Extrair projetos únicos das leads
  const projetosUnicos = Array.from(new Set(
    leads
      .map(f => f['Projetos Cormeciais'])
      .filter(Boolean)
  )).sort();

  const handleFilterChange = (type: keyof FinancialFilterState, value: string | null) => {
    const newFilters = { ...filters, [type]: value || '' };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters = { scouter: '', projeto: '' };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = filters.scouter || filters.projeto;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Financeiros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Scouter</label>
            <Select
              value={filters.scouter || "all"}
              onValueChange={(value) => handleFilterChange('scouter', value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os scouters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os scouters</SelectItem>
                {scouters.map((scouter) => (
                  <SelectItem key={scouter} value={scouter}>
                    {scouter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Projeto</label>
            <Select
              value={filters.projeto || "all"}
              onValueChange={(value) => handleFilterChange('projeto', value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projetosUnicos.map((projeto) => (
                  <SelectItem key={projeto} value={projeto}>
                    {projeto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.scouter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Scouter: {filters.scouter}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('scouter', null)}
                />
              </Badge>
            )}
            {filters.projeto && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Projeto: {filters.projeto}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('projeto', null)}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
