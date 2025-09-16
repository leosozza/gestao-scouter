import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ProjectionCards } from "@/components/projection/ProjectionCards";
import { ProjectionTable } from "@/components/projection/ProjectionTable";
import { ProjectionChartLines } from "@/components/projection/ProjectionChartLines";
import { ProjectionChartBars } from "@/components/projection/ProjectionChartBars";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { MainNav } from "@/components/main-nav";
import { Table2, BarChart3, LineChart, Download, Settings, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

type ScenarioType = 'conservadora' | 'provavel' | 'agressiva';

export default function Projecao() {
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('provavel');
  const [activeView, setActiveView] = useState<'cards' | 'table' | 'line-chart' | 'bar-chart'>('cards');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
    // Simple logout - redirect to home
    window.location.href = '/';
  };

  useEffect(() => {
    fetchProjectionData();
  }, []);

  const fetchProjectionData = async () => {
    setLoading(true);
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
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de projeção. Tentando novamente...",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <MobileSidebar 
              isConfigOpen={isConfigOpen}
              setIsConfigOpen={setIsConfigOpen}
              onLogout={handleLogout}
            />
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Fonte:</span>
                <select 
                  className="text-sm border rounded px-2 py-1"
                  onChange={(e) => {
                    const newSource = e.target.value as 'sheets' | 'bitrix';
                    localStorage.setItem('gestao-scouter.datasource', newSource);
                    window.location.reload();
                  }}
                  defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('gestao-scouter.datasource') || 'sheets') : 'sheets'}
                >
                  <option value="sheets">Google Sheets</option>
                  <option value="bitrix">Bitrix24</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsConfigOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <Sidebar 
          isConfigOpen={isConfigOpen}
          setIsConfigOpen={setIsConfigOpen}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 md:ml-64">
          {loading ? (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Carregando projeções...</p>
              </div>
            </div>
          ) : (
            <div className="container mx-auto p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Projeções de Performance</h1>
                  <p className="text-muted-foreground">
                    Analise as projeções de fichas e rendimentos para as próximas semanas
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Scenario Selector */}
                  <div className="flex gap-2">
                    {Object.entries(scenarioLabels).map(([key, label]) => (
                      <Button
                        key={key}
                        variant={selectedScenario === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedScenario(key as ScenarioType)}
                        className={selectedScenario === key ? scenarioColors[key as ScenarioType] : ""}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  
                  {/* View Toggle */}
                  <div className="flex gap-1 border rounded-lg p-1">
                    <Button
                      variant={activeView === 'cards' ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView('cards')}
                    >
                      Cards
                    </Button>
                    <Button
                      variant={activeView === 'table' ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView('table')}
                    >
                      <Table2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeView === 'line-chart' ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView('line-chart')}
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeView === 'bar-chart' ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveView('bar-chart')}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scenario Info */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${scenarioColors[selectedScenario]}`}>
                    <Badge variant="outline" className={scenarioColors[selectedScenario]}>
                      {scenarioLabels[selectedScenario]}
                    </Badge>
                    Cenário Selecionado
                  </CardTitle>
                  <CardDescription>
                    {selectedScenario === 'conservadora' && 
                      "Projeção baseada em performance conservadora, considerando possíveis quedas no desempenho."
                    }
                    {selectedScenario === 'provavel' && 
                      "Projeção baseada na performance histórica e tendências atuais dos scouters."
                    }
                    {selectedScenario === 'agressiva' && 
                      "Projeção otimista baseada no potencial máximo de performance dos scouters."
                    }
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Content */}
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
              
              {activeView === 'line-chart' && (
                <ProjectionChartLines 
                  data={projectionData} 
                  selectedScenario={selectedScenario}
                />
              )}
              
              {activeView === 'bar-chart' && (
                <ProjectionChartBars 
                  data={projectionData} 
                  selectedScenario={selectedScenario}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}