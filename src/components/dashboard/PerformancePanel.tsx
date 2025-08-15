
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BeatLoader } from 'react-spinners';

interface PerformancePanelProps {
  isLoading: boolean;
}

export const PerformancePanel = ({ isLoading }: PerformancePanelProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <BeatLoader color="#4ade80" />
      </div>
    );
  }

  const mockScouterPerformance = [
    { name: "João Silva", fichas: 85, meta: 100, progresso: 85 },
    { name: "Maria Santos", fichas: 92, meta: 100, progresso: 92 },
    { name: "Pedro Costa", fichas: 78, meta: 100, progresso: 78 },
    { name: "Ana Lima", fichas: 95, meta: 100, progresso: 95 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Scouters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockScouterPerformance.map((scouter) => (
              <div key={scouter.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{scouter.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {scouter.fichas}/{scouter.meta} fichas
                  </span>
                </div>
                <Progress value={scouter.progresso} className="h-2" />
                <div className="text-xs text-muted-foreground text-right">
                  {scouter.progresso}% da meta
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métricas de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">87%</div>
              <div className="text-sm text-muted-foreground">Taxa de Conversão</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">4.2</div>
              <div className="text-sm text-muted-foreground">Fichas/Dia Média</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">12.5</div>
              <div className="text-sm text-muted-foreground">Dias até Meta</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
