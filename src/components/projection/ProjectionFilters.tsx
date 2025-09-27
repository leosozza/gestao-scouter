import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectionType } from "@/repositories/projectionsRepo";

interface ProjectionFiltersProps {
  projectionType: ProjectionType;
  selectedFilter?: string;
  availableScouters: string[];
  availableProjetos: string[];
  onProjectionTypeChange: (type: ProjectionType) => void;
  onSelectedFilterChange: (filter?: string) => void;
}

export function ProjectionFilters({
  projectionType,
  selectedFilter,
  availableScouters,
  availableProjetos,
  onProjectionTypeChange,
  onSelectedFilterChange,
}: ProjectionFiltersProps) {
  const availableOptions = projectionType === 'scouter' ? availableScouters : availableProjetos;
  const filterLabel = projectionType === 'scouter' ? 'Scouter' : 'Projeto';

  const clearFilters = () => {
    onSelectedFilterChange(undefined);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filtros de Projeção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Tipo de Análise</label>
            <Select value={projectionType} onValueChange={(value: ProjectionType) => onProjectionTypeChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scouter">Por Scouter</SelectItem>
                <SelectItem value="projeto">Por Projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">{filterLabel} Específico</label>
            <Select
              value={selectedFilter || "all"}
              onValueChange={(value) => onSelectedFilterChange(value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Todos os ${projectionType === 'scouter' ? 'scouters' : 'projetos'}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os {projectionType === 'scouter' ? 'scouters' : 'projetos'}</SelectItem>
                {availableOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFilter && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>

        {selectedFilter && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              {filterLabel}: {selectedFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={clearFilters}
              />
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}