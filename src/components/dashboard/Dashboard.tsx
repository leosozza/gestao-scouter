import { useState, useEffect } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { FilterPanel, DashboardFilters } from "./FilterPanel";
import { KPICard } from "./KPICard";
import { CustomBarChart } from "./charts/BarChart";
import { CustomLineChart } from "./charts/LineChart";
import { AnalysisPanel } from "./AnalysisPanel";
import { Target, DollarSign, Calendar, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { fetchSheetData, mockFichas, mockProjetos } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    scouters: [],
    projects: []
  });

  const [data, setData] = useState<any>({
    fichas: [],
    projetos: [],
    metas: []
  });

  const [processedData, setProcessedData] = useState<any>({});
  const { toast } = useToast();

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Processar dados quando filtros mudam
  useEffect(() => {
    if (data.fichas.length > 0) {
      processData();
    }
  }, [filters, data]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Simular carregamento dos dados do Google Sheets
      const [fichas, projetos, metas] = await Promise.all([
        fetchSheetData('fichas'),
        fetchSheetData('projetos'), 
        fetchSheetData('metas')
      ]);

      setData({ fichas, projetos, metas });
      
      toast({
        title: "Dados carregados",
        description: "Dashboard atualizado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Usando dados offline",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processData = () => {
    const filteredFichas = data.fichas.filter((ficha: any) => {
      const fichaDate = new Date(ficha.Data_de_Criacao_da_Ficha);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      const dateInRange = fichaDate >= startDate && fichaDate <= endDate;
      const scouterMatch = filters.scouters.length === 0 || filters.scouters.includes(ficha.Gestao_de_Scouter);
      const projectMatch = filters.projects.length === 0 || filters.projects.includes(ficha.Projetos_Comerciais);
      
      return dateInRange && scouterMatch && projectMatch;
    });

    // KPIs
    const totalFichas = filteredFichas.length;
    const diasPagos = calcularDiasPagos(filteredFichas);
    const ajudaCusto = diasPagos * 30;
    const pagamentoPorFichas = calcularPagamentoPorFichas(filteredFichas);
    const metaProgress = calcularProgressoMeta(filteredFichas);

    // Dados para gráficos
    const fichasPorScouter = processarFichasPorScouter(filteredFichas);
    const fichasPorProjeto = processarFichasPorProjeto(filteredFichas);
    const projecaoVsReal = processarProjecaoVsReal(filteredFichas);

    setProcessedData({
      kpis: {
        totalFichas,
        diasPagos,
        ajudaCusto,
        pagamentoPorFichas,
        metaProgress,
        ritmoNecessario: calcularRitmoNecessario(filteredFichas)
      },
      charts: {
        fichasPorScouter,
        fichasPorProjeto,
        projecaoVsReal
      },
      filteredFichas
    });
  };

  const calcularDiasPagos = (fichas: any[]) => {
    const fichasPorDia = fichas.reduce((acc, ficha) => {
      const date = new Date(ficha.Data_de_Criacao_da_Ficha).toISOString().split('T')[0];
      const scouter = ficha.Gestao_de_Scouter;
      const key = `${date}-${scouter}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.values(fichasPorDia).filter((count: any) => count > 20).length;
  };

  const calcularPagamentoPorFichas = (fichas: any[]) => {
    return fichas.reduce((total, ficha) => {
      const valor = parseFloat(ficha.Valor_por_Fichas.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0;
      return total + valor;
    }, 0);
  };

  const calcularProgressoMeta = (fichas: any[]) => {
    if (filters.projects.length === 1) {
      const projeto = data.projetos.find((p: any) => p.Agencia_e_Seletiva === filters.projects[0]);
      if (projeto) {
        return Math.round((fichas.length / projeto.Meta_de_Fichas) * 100);
      }
    }
    return null;
  };

  const calcularRitmoNecessario = (fichas: any[]) => {
    if (filters.projects.length === 1) {
      const projeto = data.projetos.find((p: any) => p.Agencia_e_Seletiva === filters.projects[0]);
      if (projeto) {
        const diasRestantes = Math.max(1, Math.ceil((new Date(projeto.Termino_Captacao_Fichas).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        const fichasRestantes = projeto.Meta_de_Fichas - fichas.length;
        return Math.ceil(fichasRestantes / diasRestantes);
      }
    }
    return null;
  };

  const processarFichasPorScouter = (fichas: any[]) => {
    const counts = fichas.reduce((acc, ficha) => {
      acc[ficha.Gestao_de_Scouter] = (acc[ficha.Gestao_de_Scouter] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const processarFichasPorProjeto = (fichas: any[]) => {
    const counts = fichas.reduce((acc, ficha) => {
      acc[ficha.Projetos_Comerciais] = (acc[ficha.Projetos_Comerciais] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  };

  const processarProjecaoVsReal = (fichas: any[]) => {
    // Simulação de dados para o gráfico de projeção
    const days = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2025, 7, i + 1);
      const esperado = (i + 1) * 32; // Meta diária simulada
      const real = fichas.filter(f => {
        const fichaDate = new Date(f.Data_de_Criacao_da_Ficha);
        return fichaDate <= date;
      }).length;

      return {
        date: date.toISOString().split('T')[0],
        real,
        esperado,
        status: real >= esperado ? 'on-track' : 'behind'
      };
    });

    return days;
  };

  const availableScouters = [...new Set(data.fichas.map((f: any) => f.Gestao_de_Scouter))] as string[];
  const availableProjects = [...new Set(data.fichas.map((f: any) => f.Projetos_Comerciais))] as string[];

  const handleApplyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: "Dashboard atualizado com os novos filtros"
    });
  };

  const handleClearFilters = () => {
    toast({
      title: "Filtros limpos", 
      description: "Exibindo todos os dados"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableScouters={availableScouters}
              availableProjects={availableProjects}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* KPIs */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <KPICard
                title="Total de Fichas"
                value={processedData.kpis?.totalFichas || 0}
                icon={Target}
                isLoading={isLoading}
              />
              <KPICard
                title="Ajuda de Custo"
                value={`R$ ${(processedData.kpis?.ajudaCusto || 0).toLocaleString('pt-BR')}`}
                subtitle={`${processedData.kpis?.diasPagos || 0} dias pagos`}
                icon={DollarSign}
                variant="success"
                isLoading={isLoading}
              />
              <KPICard
                title="Pagamento por Fichas"
                value={`R$ ${(processedData.kpis?.pagamentoPorFichas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={TrendingUp}
                variant="success"
                isLoading={isLoading}
              />
              {processedData.kpis?.metaProgress && (
                <KPICard
                  title="% da Meta"
                  value={`${processedData.kpis.metaProgress}%`}
                  icon={Target}
                  variant={processedData.kpis.metaProgress >= 50 ? "success" : "warning"}
                  isLoading={isLoading}
                />
              )}
              {processedData.kpis?.ritmoNecessario && (
                <KPICard
                  title="Ritmo Necessário"
                  value={`${processedData.kpis.ritmoNecessario}/dia`}
                  subtitle="para atingir meta"
                  icon={AlertTriangle}
                  variant={processedData.kpis.ritmoNecessario > 25 ? "destructive" : "warning"}
                  isLoading={isLoading}
                />
              )}
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomBarChart
            title="Fichas por Scouter"
            data={processedData.charts?.fichasPorScouter || []}
            color="hsl(var(--primary))"
            isLoading={isLoading}
          />
          <CustomBarChart
            title="Fichas por Projeto"
            data={processedData.charts?.fichasPorProjeto || []}
            color="hsl(var(--success))"
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <CustomLineChart
            title="Projeção vs Real (Acumulado)"
            data={processedData.charts?.projecaoVsReal || []}
            isLoading={isLoading}
          />
        </div>

        {/* Análise */}
        <AnalysisPanel
          filters={filters}
          data={processedData}
        />
      </div>
    </div>
  );
};