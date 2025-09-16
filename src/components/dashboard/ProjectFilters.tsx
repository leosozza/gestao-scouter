import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinancialFilterState } from "./FinancialFilters";

interface ProjectFiltersProps {
  projetos: any[];
  filters: FinancialFilterState;
  setFilters: (filters: FinancialFilterState) => void;
}

export function ProjectFilters({ projetos, filters, setFilters }: ProjectFiltersProps) {
  return (
    <div className="flex gap-4">
      <Select
        value={filters.projeto}
        onValueChange={(value) => setFilters({ ...filters, projeto: value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por projeto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos os projetos</SelectItem>
          {projetos.map((projeto, index) => (
            <SelectItem key={index} value={projeto['Agencia e Seletiva'] || projeto.nome}>
              {projeto['Agencia e Seletiva'] || projeto.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.scouter}
        onValueChange={(value) => setFilters({ ...filters, scouter: value })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por scouter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos os scouters</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}