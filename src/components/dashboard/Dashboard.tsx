import { useState, useEffect } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { FilterPanel, DashboardFilters } from "./FilterPanel";
import { UploadPanel } from "./UploadPanel";
import { KPICard } from "./KPICard";
import { CustomBarChart } from "./charts/BarChart";
import { CustomLineChart } from "./charts/LineChart";
import { AnalysisPanel } from "./AnalysisPanel";
import { SavedViews } from "./SavedViews";
import { ScouterTable } from "./tables/ScouterTable";
import { ProjectTable } from "./tables/ProjectTable";
import { AuditTable } from "./tables/AuditTable";
import { Target, DollarSign, Calendar, TrendingUp, Users, AlertTriangle, Camera, CheckCircle, Clock } from "lucide-react";
import { fetchSheetData, mockFichas, mockProjetos } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'sheets' | 'upload' | 'custom-sheets'>('sheets');
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
    if (dataSource === 'sheets') {
      loadData();
    }
  }, [dataSource]);

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

  const handleUploadedData = (uploadedData: { fichas: any[], projetos: any[] }) => {
    setData({
      fichas: uploadedData.fichas,
      projetos: uploadedData.projetos,
      metas: [] // Metas não implementadas no upload ainda
    });
    
    // Limpar filtros ao trocar fonte de dados
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      scouters: [],
      projects: []
    });
  };

  const handleSourceChange = (source: 'sheets' | 'upload' | 'custom-sheets') => {
    setDataSource(source);
    if (source === 'sheets') {
      loadData();
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

    // KPIs principais
    const totalFichas = filteredFichas.length;
    const diasPagos = calcularDiasPagos(filteredFichas);
    const ajudaCusto = diasPagos * 30;
    const pagamentoPorFichas = calcularPagamentoPorFichas(filteredFichas);
    const metaProgress = calcularProgressoMeta(filteredFichas);

    // Novos KPIs
    const percentFoto = calcularPercentFoto(filteredFichas);
    const taxaConfirmacao = calcularTaxaConfirmacao(filteredFichas);
    const intervaloMedio = calcularIntervaloMedio(filteredFichas);
    const custoFichaConfirmada = calcularCustoFichaConfirmada(filteredFichas, ajudaCusto, pagamentoPorFichas);

    // Dados para gráficos
    const fichasPorScouter = processarFichasPorScouter(filteredFichas);
    const fichasPorProjeto = processarFichasPorProjeto(filteredFichas);
    const projecaoVsReal = processarProjecaoVsReal(filteredFichas);

    // Dados para tabelas
    const scouterTableData = processarDadosScouters(filteredFichas);
    const projectTableData = processarDadosProjetos(filteredFichas);
    const auditTableData = processarDadosAuditoria(filteredFichas);

    setProcessedData({
      kpis: {
        totalFichas,
        diasPagos,
        ajudaCusto,
        pagamentoPorFichas,
        metaProgress,
        ritmoNecessario: calcularRitmoNecessario(filteredFichas),
        percentFoto,
        taxaConfirmacao,
        intervaloMedio,
        custoFichaConfirmada
      },
      charts: {
        fichasPorScouter,
        fichasPorProjeto,
        projecaoVsReal
      },
      tables: {
        scouters: scouterTableData,
        projects: projectTableData,
        audit: auditTableData
      },
      filteredFichas
    });
  };

  const calcularPercentFoto = (fichas: any[]) => {
    if (fichas.length === 0) return 0;
    const comFoto = fichas.filter(f => f.tem_foto || f.Tem_Foto === 'Sim').length;
    return (comFoto / fichas.length) * 100;
  };

  const calcularTaxaConfirmacao = (fichas: any[]) => {
    if (fichas.length === 0) return 0;
    const confirmadas = fichas.filter(f => f.status_normalizado === 'Confirmado' || f.Status_Confirmacao === 'Confirmado').length;
    return (confirmadas / fichas.length) * 100;
  };

  const calcularIntervaloMedio = (fichas: any[]) => {
    // Simulação - em implementação real seria calculado com base nos timestamps
    return Math.random() * 10 + 5; // 5-15 minutos
  };

  const calcularCustoFichaConfirmada = (fichas: any[], ajudaCusto: number, pagamentoPorFichas: number) => {
    const confirmadas = fichas.filter(f => f.status_normalizado === 'Confirmado' || f.Status_Confirmacao === 'Confirmado').length;
    if (confirmadas === 0) return 0;
    return (ajudaCusto + pagamentoPorFichas) / confirmadas;
  };

  const processarDadosScouters = (fichas: any[]) => {
    const scouterStats = fichas.reduce((acc, ficha) => {
      const scouter = ficha.Gestao_de_Scouter;
      if (!acc[scouter]) {
        acc[scouter] = {
          fichas: 0,
          valor: 0,
          diasTrabalhados: new Set(),
          comFoto: 0,
          confirmadas: 0
        };
      }
      
      acc[scouter].fichas++;
      acc[scouter].valor += ficha.valor_por_ficha_num || 0;
      
      const date = new Date(ficha.Data_de_Criacao_da_Ficha).toISOString().split('T')[0];
      acc[scouter].diasTrabalhados.add(date);
      
      if (ficha.tem_foto || ficha.Tem_Foto === 'Sim') acc[scouter].comFoto++;
      if (ficha.status_normalizado === 'Confirmado') acc[scouter].confirmadas++;
      
      return acc;
    }, {});

    return Object.entries(scouterStats).map(([scouter, stats]: [string, any]) => {
      const diasPagos = Math.floor(stats.fichas / 20);
      const ajudaCusto = diasPagos * 30;
      
      return {
        scouter,
        fichas: stats.fichas,
        mediaDia: stats.fichas / Math.max(1, stats.diasTrabalhados.size),
        diasPagos,
        ajudaCusto,
        pagamentoFichas: stats.valor,
        total: ajudaCusto + stats.valor,
        percentFoto: (stats.comFoto / stats.fichas) * 100,
        percentConfirmacao: (stats.confirmadas / stats.fichas) * 100,
        score: Math.min(100, (stats.fichas / 10) + (stats.comFoto / stats.fichas * 50) + (stats.confirmadas / stats.fichas * 30))
      };
    }).sort((a, b) => b.score - a.score);
  };

  const processarDadosProjetos = (fichas: any[]) => {
    const projectStats = fichas.reduce((acc, ficha) => {
      const projeto = ficha.Projetos_Comerciais;
      if (!acc[projeto]) {
        acc[projeto] = { fichas: 0, valor: 0 };
      }
      acc[projeto].fichas++;
      acc[projeto].valor += ficha.valor_por_ficha_num || 0;
      return acc;
    }, {});

    return Object.entries(projectStats).map(([projeto, stats]: [string, any]) => {
      const meta = 1000; // Simulação
      const esperado = 500; // Simulação
      const delta = stats.fichas - esperado;
      
      return {
        projeto,
        meta,
        progresso: stats.fichas,
        esperado,
        delta,
        status: delta >= 0 ? 'on-track' : delta > -100 ? 'warning' : 'critical',
        roi: stats.valor / 1000, // Simulação
        percentConcluido: (stats.fichas / meta) * 100
      };
    });
  };

  const processarDadosAuditoria = (fichas: any[]) => {
    const problemas = [];
    
    fichas.forEach(ficha => {
      // Fichas sem foto
      if (!ficha.tem_foto && ficha.Tem_Foto !== 'Sim') {
        problemas.push({
          id: ficha.ID.toString(),
          scouter: ficha.Gestao_de_Scouter,
          projeto: ficha.Projetos_Comerciais,
          dataFicha: new Date(ficha.Data_de_Criacao_da_Ficha).toLocaleDateString('pt-BR'),
          problema: 'Sem foto',
          severidade: 'medium' as const,
          detalhes: 'Ficha cadastrada sem foto anexada'
        });
      }
      
      // Status aguardando há muito tempo (simulação)
      if (ficha.status_normalizado === 'Aguardando') {
        const diasAguardando = Math.floor(Math.random() * 10);
        if (diasAguardando > 5) {
          problemas.push({
            id: ficha.ID.toString(),
            scouter: ficha.Gestao_de_Scouter,
            projeto: ficha.Projetos_Comerciais,
            dataFicha: new Date(ficha.Data_de_Criacao_da_Ficha).toLocaleDateString('pt-BR'),
            problema: 'Aguardando confirmação',
            severidade: 'high' as const,
            detalhes: `${diasAguardando} dias aguardando confirmação`
          });
        }
      }
    });

    return problemas.slice(0, 10); // Limitar a 10 itens
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

  const handleLoadView = (viewFilters: DashboardFilters) => {
    setFilters(viewFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onLogout={onLogout} />
      
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Upload Panel */}
        <UploadPanel 
          onDataLoad={handleUploadedData}
          onSourceChange={handleSourceChange}
          currentSource={dataSource}
        />

        {/* Filtros e Visões Salvas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <div className="lg:col-span-2">
            <SavedViews
              currentFilters={filters}
              onLoadView={handleLoadView}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <KPICard
            title="% com Foto"
            value={`${(processedData.kpis?.percentFoto || 0).toFixed(1)}%`}
            icon={Camera}
            variant={processedData.kpis?.percentFoto >= 80 ? "success" : "warning"}
            isLoading={isLoading}
          />
          <KPICard
            title="Taxa de Confirmação"
            value={`${(processedData.kpis?.taxaConfirmacao || 0).toFixed(1)}%`}
            icon={CheckCircle}
            variant={processedData.kpis?.taxaConfirmacao >= 70 ? "success" : "warning"}
            isLoading={isLoading}
          />
          <KPICard
            title="Intervalo Médio"
            value={`${(processedData.kpis?.intervaloMedio || 0).toFixed(1)} min`}
            icon={Clock}
            variant={processedData.kpis?.intervaloMedio <= 8 ? "success" : "warning"}
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

        {/* Tabelas */}
        <div className="grid grid-cols-1 gap-6">
          <ScouterTable
            data={processedData.tables?.scouters || []}
            isLoading={isLoading}
          />
          
          <ProjectTable
            data={processedData.tables?.projects || []}
            isLoading={isLoading}
          />
          
          <AuditTable
            data={processedData.tables?.audit || []}
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
