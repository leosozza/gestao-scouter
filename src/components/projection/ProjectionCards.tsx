import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Trophy, DollarSign } from "lucide-react";
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

interface ProjectionCardsProps {
  data: ProjectionData[];
  selectedScenario: 'conservadora' | 'provavel' | 'agressiva';
  getScenarioValue: (item: ProjectionData) => number;
}

export function ProjectionCards({ data, selectedScenario, getScenarioValue }: ProjectionCardsProps) {
  // Group data by scouter
  const scouterData = data.reduce((acc, item) => {
    if (!acc[item.scouter_name]) {
      acc[item.scouter_name] = [];
    }
    acc[item.scouter_name].push(item);
    return acc;
  }, {} as Record<string, ProjectionData[]>);

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

  const scenarioColors = {
    conservadora: 'text-orange-600',
    provavel: 'text-blue-600',
    agressiva: 'text-green-600'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(scouterData).map(([scouterName, scouterProjections]) => {
        const totalProjection = scouterProjections.reduce((sum, item) => sum + getScenarioValue(item), 0);
        const firstWeekProjection = getScenarioValue(scouterProjections[0]);
        const tier = scouterProjections[0]?.tier_name || 'N/A';
        const weeklyGoal = scouterProjections[0]?.weekly_goal || 0;

        return (
          <Card key={scouterName} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{scouterName}</CardTitle>
                <Badge className={getTierColor(tier)} variant="secondary">
                  {tier}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weekly Goal */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Meta Semanal</span>
                </div>
                <span className="font-medium">{weeklyGoal} fichas</span>
              </div>

              {/* Next Week Projection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Próxima Semana</span>
                </div>
                <span className={`font-medium ${scenarioColors[selectedScenario]}`}>
                  {formatCurrency(firstWeekProjection)}
                </span>
              </div>

              {/* 8-Week Total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total 8 Semanas</span>
                </div>
                <span className={`font-bold text-lg ${scenarioColors[selectedScenario]}`}>
                  {formatCurrency(totalProjection)}
                </span>
              </div>

              {/* Performance Indicator */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">
                    Baseado no cenário {selectedScenario}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}