import { useState, useEffect } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { OverviewPanel } from './OverviewPanel';
import { PerformancePanel } from './PerformancePanel';
import { FinancialPanel } from './FinancialPanel';
import { FilterPanel, DashboardFilters } from './FilterPanel';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useToast } from '@/hooks/use-toast';
import { fetchSheetData } from '@/data/mockData';
import { Ficha, Projeto } from '@/data/mockData';
import { BeatLoader } from 'react-spinners';

interface ProcessedData {
  processedFichas: Ficha[];
  projetos: Projeto[];
}

export const Dashboard = () => {
  const [activePanel, setActivePanel] = useState<'overview' | 'performance' | 'financial'>('overview');
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: { start: '', end: '' },
    scouters: [],
    projects: [],
  });
  const [availableScouters, setAvailableScouters] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const { toast } = useToast();

  const handlePanelChange = (panelType: string) => {
    if (panelType === 'financial') {
      setActivePanel('financial');
    } else {
      setActivePanel(panelType as any);
    }
  };

  const handleFiltersChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const fichas = await fetchSheetData('fichas');
      const projetos = await fetchSheetData('projetos');

      // Processar e aplicar filtros
      const processedFichas = processAndFilterFichas(fichas, filters);

      setProcessedData({ processedFichas, projetos });
      updateAvailableFilters(processedFichas, projetos);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Ocorreu um erro ao carregar os dados. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processAndFilterFichas = (fichas: Ficha[], filters: DashboardFilters): Ficha[] => {
    let filteredFichas = [...fichas];

    // Filtro por data
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);

      filteredFichas = filteredFichas.filter(ficha => {
        const fichaDate = new Date(ficha.Data_de_Criacao_da_Ficha);
        return fichaDate >= startDate && fichaDate <= endDate;
      });
    }

    // Filtro por scouter
    if (filters.scouters.length > 0) {
      filteredFichas = filteredFichas.filter(ficha =>
        filters.scouters.includes(ficha.Gestao_de_Scouter)
      );
    }

    // Filtro por projeto
    if (filters.projects.length > 0) {
      filteredFichas = filteredFichas.filter(ficha =>
        filters.projects.includes(ficha.Projetos_Comerciais)
      );
    }

    return filteredFichas;
  };

  const updateAvailableFilters = (fichas: Ficha[], projetos: Projeto[]) => {
    // Scouters
    const scouters = [...new Set(fichas.map(ficha => ficha.Gestao_de_Scouter))];
    setAvailableScouters(scouters);

    // Projetos
    const projetosList = [...new Set(fichas.map(ficha => ficha.Projetos_Comerciais))];
    setAvailableProjects(projetosList);
  };

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const renderPanel = () => {
    switch (activePanel) {
      case 'overview':
        return <OverviewPanel isLoading={isLoading} />;
      case 'performance':
        return <PerformancePanel isLoading={isLoading} />;
      case 'financial':
        return (
        <FinancialPanel 
          isLoading={isLoading}
          filters={filters}
          availableScouters={availableScouters}
          dashboardData={{
            filteredFichas: processedData?.processedFichas || [],
            projetos: processedData?.projetos || []
          }}
        />
      );
      default:
        return <div>Painel não encontrado</div>;
    }
  };

  return (
    <div className="container mx-auto py-10">
      <DashboardHeader activePanel={activePanel} onPanelChange={handlePanelChange} />

      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="col-span-1">
          <FilterPanel
            filters={filters}
            availableScouters={availableScouters}
            availableProjects={availableProjects}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        <div className="col-span-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <BeatLoader color="#4ade80" />
            </div>
          ) : (
            renderPanel()
          )}
        </div>
      </div>
    </div>
  );
};
