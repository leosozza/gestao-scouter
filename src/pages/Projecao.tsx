import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProjectionCards } from "@/components/projection/ProjectionCards";
import { ProjectionTable } from "@/components/projection/ProjectionTable";
import { ProjectionChartLines } from "@/components/projection/ProjectionChartLines";
import { ProjectionChartBars } from "@/components/projection/ProjectionChartBars";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, LineChart, Table } from "lucide-react";

type ScenarioType = 'conservadora' | 'provavel' | 'agressiva';

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

export default function Projecao() {
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('provavel');
  const [activeView, setActiveView] = useState<'cards' | 'table' | 'lines' | 'bars'>('cards');

  useEffect(() => {
    fetchProjectionData();
  }, []);

  const fetchProjectionData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_projecao_scouter')
        .select('*')
        .order('scouter_name', { ascending: true })
        .order('semana_futura', { ascending: true });

      if (error) throw error;
      setProjectionData(data || []);
    } catch (error) {
      console.error('Error fetching projection data:', error);
    } finally {
      setIsLoading(false);
    }
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

  const scenarioLabels = {
    conservadora: 'Conservador',
    provavel: 'Provável',
    agressiva: 'Agressivo'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Carregando projeções...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Projeções de Performance
            </h1>
            <p className="text-muted-foreground">
              Análise preditiva de receita por scouter (Sem+1 até Sem+8)
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Scenario Selector */}
            <Select value={selectedScenario} onValueChange={(value: ScenarioType) => setSelectedScenario(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cenário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservadora">
                  <span className={scenarioColors.conservadora}>Conservador</span>
                </SelectItem>
                <SelectItem value="provavel">
                  <span className={scenarioColors.provavel}>Provável</span>
                </SelectItem>
                <SelectItem value="agressiva">
                  <span className={scenarioColors.agressiva}>Agressivo</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* View Selector */}
            <div className="flex rounded-lg border">
              <Button
                variant={activeView === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('cards')}
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('table')}
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'lines' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('lines')}
              >
                <LineChart className="h-4 w-4" />
              </Button>
              <Button
                variant={activeView === 'bars' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('bars')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scenario Info */}
        <Card>
          <CardContent className="p-4">
            <div className={`text-sm ${scenarioColors[selectedScenario]}`}>
              <strong>Cenário {scenarioLabels[selectedScenario]}:</strong>
              {selectedScenario === 'conservadora' && ' Decay de 10% por semana, taxa de conversão mínima'}
              {selectedScenario === 'provavel' && ' Decay de 5% por semana, taxa de conversão média'}
              {selectedScenario === 'agressiva' && ' Sem decay, taxa de conversão máxima'}
            </div>
          </CardContent>
        </Card>

        {/* Content based on active view */}
        {activeView === 'cards' && (
          <ProjectionCards 
            data={projectionData} 
            selectedScenario={selectedScenario}
            getScenarioValue={getScenarioValue}
          />
        )}

        {activeView === 'table' && (
          <ProjectionTable 
            data={projectionData} 
            selectedScenario={selectedScenario}
          />
        )}

        {activeView === 'lines' && (
          <ProjectionChartLines 
            data={projectionData} 
            selectedScenario={selectedScenario}
          />
        )}

        {activeView === 'bars' && (
          <ProjectionChartBars 
            data={projectionData} 
            selectedScenario={selectedScenario}
          />
        )}
      </div>
    </div>
  );
}