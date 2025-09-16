import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

interface ProjectionData {
  scouter_name: string;
  semana_futura: number;
  semana_label: string;
  weekly_goal: number;
  tier_name: string;
  projecao_conservadora: number;
  projecao_provavel: number;
  projecao_agressiva: number;
  projecao_historica: number;
}

interface ProjectionTableProps {
  data: ProjectionData[];
  selectedScenario: 'conservadora' | 'provavel' | 'agressiva';
}

export function ProjectionTable({ data, selectedScenario }: ProjectionTableProps) {
  const getTierColor = (tier: string) => {
    const colors = {
      'Iniciante': 'bg-gray-100 text-gray-800',
      'Aprendiz': 'bg-blue-100 text-blue-800',
      'Junior': 'bg-green-100 text-green-800',
      'Pleno': 'bg-yellow-100 text-yellow-800',
      'Senior': 'bg-orange-100 text-orange-800',
      'Especialista': 'bg-purple-100 text-purple-800',
      'Gestor': 'bg-red-100 text-red-800'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getScenarioValue = (item: ProjectionData) => {
    switch (selectedScenario) {
      case 'conservadora': return item.projecao_conservadora;
      case 'provavel': return item.projecao_provavel;
      case 'agressiva': return item.projecao_agressiva;
      default: return item.projecao_provavel;
    }
  };

  const scenarioColors = {
    conservadora: 'text-orange-600',
    provavel: 'text-blue-600',
    agressiva: 'text-green-600'
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scouter</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Semana</TableHead>
            <TableHead>Meta Semanal</TableHead>
            <TableHead className="text-right">Conservador</TableHead>
            <TableHead className="text-right">Provável</TableHead>
            <TableHead className="text-right">Agressivo</TableHead>
            <TableHead className="text-right">Histórico</TableHead>
            <TableHead className={`text-right font-bold ${scenarioColors[selectedScenario]}`}>
              Selecionado
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={`${item.scouter_name}-${item.semana_futura}`}>
              <TableCell className="font-medium">{item.scouter_name}</TableCell>
              <TableCell>
                <Badge className={getTierColor(item.tier_name)} variant="secondary">
                  {item.tier_name}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.semana_label}</Badge>
              </TableCell>
              <TableCell>{item.weekly_goal} fichas</TableCell>
              <TableCell className="text-right text-orange-600">
                {formatCurrency(item.projecao_conservadora)}
              </TableCell>
              <TableCell className="text-right text-blue-600">
                {formatCurrency(item.projecao_provavel)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(item.projecao_agressiva)}
              </TableCell>
              <TableCell className="text-right text-purple-600">
                {formatCurrency(item.projecao_historica)}
              </TableCell>
              <TableCell className={`text-right font-bold ${scenarioColors[selectedScenario]}`}>
                {formatCurrency(getScenarioValue(item))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}