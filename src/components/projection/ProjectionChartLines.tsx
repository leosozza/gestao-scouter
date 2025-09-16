import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProjectionChartLinesProps {
  data: ProjectionData[];
  selectedScenario: 'conservadora' | 'provavel' | 'agressiva';
}

export function ProjectionChartLines({ data, selectedScenario }: ProjectionChartLinesProps) {
  // Transform data for line chart - group by week and show all scouters
  const chartData = Array.from({ length: 8 }, (_, i) => {
    const semana = i + 1;
    const semanaData: any = {
      semana: `Sem+${semana}`,
      semana_num: semana
    };

    // Get unique scouters
    const scouters = [...new Set(data.map(item => item.scouter_name))];
    
    scouters.forEach(scouter => {
      const scouterWeekData = data.find(
        item => item.scouter_name === scouter && item.semana_futura === semana
      );
      
      if (scouterWeekData) {
        switch (selectedScenario) {
          case 'conservadora':
            semanaData[scouter] = scouterWeekData.projecao_conservadora;
            break;
          case 'provavel':
            semanaData[scouter] = scouterWeekData.projecao_provavel;
            break;
          case 'agressiva':
            semanaData[scouter] = scouterWeekData.projecao_agressiva;
            break;
        }
      }
    });

    return semanaData;
  });

  const scouters = [...new Set(data.map(item => item.scouter_name))];
  
  // Generate colors for each scouter
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
    '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#f0e68c'
  ];

  const scenarioColors = {
    conservadora: 'text-orange-600',
    provavel: 'text-blue-600',
    agressiva: 'text-green-600'
  };

  const scenarioLabels = {
    conservadora: 'Conservador',
    provavel: 'Provável',
    agressiva: 'Agressivo'
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${scenarioColors[selectedScenario]}`}>
            Evolução das Projeções - Cenário {scenarioLabels[selectedScenario]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="semana" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelFormatter={(label) => `Semana: ${label}`}
                />
                <Legend />
                {scouters.map((scouter, index) => (
                  <Line
                    key={scouter}
                    type="monotone"
                    dataKey={scouter}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sem+1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${scenarioColors[selectedScenario]}`}>
              {formatCurrency(
                chartData[0] ? Object.keys(chartData[0])
                  .filter(key => key !== 'semana' && key !== 'semana_num')
                  .reduce((sum, scouter) => sum + (chartData[0][scouter] || 0), 0) : 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sem+4</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${scenarioColors[selectedScenario]}`}>
              {formatCurrency(
                chartData[3] ? Object.keys(chartData[3])
                  .filter(key => key !== 'semana' && key !== 'semana_num')
                  .reduce((sum, scouter) => sum + (chartData[3][scouter] || 0), 0) : 0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sem+8</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${scenarioColors[selectedScenario]}`}>
              {formatCurrency(
                chartData[7] ? Object.keys(chartData[7])
                  .filter(key => key !== 'semana' && key !== 'semana_num')
                  .reduce((sum, scouter) => sum + (chartData[7][scouter] || 0), 0) : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}