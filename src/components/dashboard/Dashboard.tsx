import { useState, useEffect } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { FilterPanel, DashboardFilters } from "./FilterPanel";
import { UploadPanel } from "./UploadPanel";
import { KPICard } from "./KPICard";
import { CustomBarChart } from "./charts/BarChart";
import { CustomLineChart } from "./charts/LineChart";
import { HistogramChart } from "./charts/HistogramChart";
import { FunnelChart } from "./charts/FunnelChart";
import { MapChart } from "./charts/MapChart";
import { AnalysisPanel } from "./AnalysisPanel";
import { SavedViews } from "./SavedViews";
import { ConfigPanel } from "./ConfigPanel";
import { ScouterTable } from "./tables/ScouterTable";
import { ProjectTable } from "./tables/ProjectTable";
import { AuditTable } from "./tables/AuditTable";
import { LocationTable } from "./tables/LocationTable";
import { IntervalTable } from "./tables/IntervalTable";
import { PipelineTable } from "./tables/PipelineTable";
import { Target, DollarSign, Calendar, TrendingUp, Users, AlertTriangle, Camera, CheckCircle, Clock, MapPin, Zap, Settings } from "lucide-react";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'sheets' | 'upload' | 'custom-sheets'>('sheets');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState({
    spreadsheetUrl: '',
    ajudaCustoDiaria: 30,
    valorPorFicha: 2.5
  });
  
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

  // Carregar dados automaticamente na inicialização
  useEffect(() => {
    loadData();
  }, []);

  // Processar dados quando filtros mudam
  useEffect(() => {
    if (data.fichas.length > 0) {
      processData();
    }
  }, [filters, data, config]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('Iniciando carregamento de dados...');
      
      const [fichas, projetos, metas] = await Promise.all([
        GoogleSheetsService.fetchFichas(),
        GoogleSheetsService.fetchProjetos(),
        GoogleSheetsService.fetchMetasScouter()
      ]);

      console.log('Dados carregados:', { 
        fichas: fichas.length, 
        projetos: projetos.length, 
        metas: metas.length 
      });

      setData({ fichas, projetos, metas });
      
      toast({
        title: "Dados carregados",
        description: `${fichas.length} fichas carregadas com sucesso`
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Verifique a conexão com a planilha",
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
      metas: []
    });
    
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

  const handleConfigUpdate = (newConfig: any) => {
    setConfig(newConfig);
    // Se mudou a URL da planilha, recarregar dados
    if (newConfig.spreadsheetUrl !== config.spreadsheetUrl) {
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

    console.log('Fichas filtradas:', filteredFichas.length);

    // KPIs principais
    const totalFichas = filteredFichas.length;
    const diasPagos = calcularDiasPagos(filteredFichas);
    const ajudaCusto = diasPagos * config.ajudaCustoDiaria;
    const pagamentoPorFichas = calcularPagamentoPorFichas(filteredFichas);
    const metaProgress = calcularProgressoMeta(filteredFichas);

    // Novos KPIs
    const percentFoto = calcularPercentFoto(filteredFichas);
    const taxaConfirmacao = calcularTaxaConfirmacao(filteredFichas);
    const intervaloMedio = calcularIntervaloMedio(filteredFichas);
    const custoFichaConfirmada = calcularCustoFichaConfirmada(filteredFichas, ajudaCusto, pagamentoPorFichas);
    const percentIntervalosCurtos = calcularPercentIntervalosCurtos(filteredFichas);
    const roiProjeto = calcularROIProjeto(filteredFichas);

    // Dados para gráficos com valores no topo
    const fichasPorScouter = processarFichasPorScouter(filteredFichas);
    const fichasPorProjeto = processarFichasPorProjeto(filteredFichas);

    // Dados para tabelas
    const scouterTableData = processarDadosScouters(filteredFichas);
    const projectTableData = processarDadosProjetos(filteredFichas);
    const auditTableData = processarDadosAuditoria(filteredFichas);
    const locationTableData = processarDadosLocais(filteredFichas);
    const intervalTableData = processarDadosIntervalos(filteredFichas);
    const pipelineTableData = processarDadosPipeline(filteredFichas);

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
        custoFichaConfirmada,
        percentIntervalosCurtos,
        roiProjeto
      },
      charts: {
        fichasPorScouter,
        fichasPorProjeto,
        projecaoVsReal: processarProjecaoVsReal(filteredFichas),
        histogramData: processarHistogramIntervalos(filteredFichas),
        funnelData: processarFunnelStatus(filteredFichas),
        mapData: processarMapData(filteredFichas)
      },
      tables: {
        scouters: scouterTableData,
        projects: projectTableData,
        audit: auditTableData,
        locations: locationTableData,
        intervals: intervalTableData,
        pipeline: pipelineTableData
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

  const calcularPercentIntervalosCurtos = (fichas: any[]) => {
    if (fichas.length <= 1) return 0;
    
    // Simular intervalos curtos (<5min)
    const intervalos = fichas.map(() => Math.random() * 30); // 0-30 minutos
    const curtos = intervalos.filter(i => i < 5).length;
    return (curtos / intervalos.length) * 100;
  };

  const calcularROIProjeto = (fichas: any[]) => {
    const receita = fichas.length * 50; // Simulação de receita por ficha
    const custo = (processedData?.kpis?.ajudaCusto || 0) + (processedData?.kpis?.pagamentoPorFichas || 0);
    return custo > 0 ? receita / custo : 0;
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
    const fichasPorScouterPorDia = fichas.reduce((acc, ficha) => {
      const date = new Date(ficha.Data_de_Criacao_da_Ficha).toISOString().split('T')[0];
      const scouter = ficha.Gestao_de_Scouter;
      const key = `${date}-${scouter}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.values(fichasPorScouterPorDia).filter((count: any) => count >= 20).length;
  };

  const calcularPagamentoPorFichas = (fichas: any[]) => {
    return fichas.reduce((total, ficha) => {
      return total + (ficha.valor_por_ficha_num || config.valorPorFicha);
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

  const processarHistogramIntervalos = (fichas: any[]) => {
    const buckets = ['<5min', '5-10min', '10-20min', '20-40min', '>40min'];
    const counts = [45, 30, 15, 8, 2]; // Simulação
    const total = counts.reduce((a, b) => a + b, 0);
    
    return buckets.map((bucket, index) => ({
      bucket,
      count: counts[index],
      percentage: (counts[index] / total) * 100
    }));
  };

  const processarFunnelStatus = (fichas: any[]) => {
    const aguardando = fichas.filter(f => f.status_normalizado === 'Aguardando').length;
    const confirmadas = fichas.filter(f => f.status_normalizado === 'Confirmado').length;
    const naoConfirmadas = fichas.filter(f => f.status_normalizado === 'Não Confirmado').length;
    const total = aguardando + confirmadas + naoConfirmadas;
    
    return [
      {
        name: 'Total de Fichas',
        value: total,
        percentage: 100,
        color: 'hsl(var(--primary))'
      },
      {
        name: 'Aguardando',
        value: aguardando,
        percentage: total > 0 ? (aguardando / total) * 100 : 0,
        color: 'hsl(var(--warning))'
      },
      {
        name: 'Confirmadas',
        value: confirmadas,
        percentage: total > 0 ? (confirmadas / total) * 100 : 0,
        color: 'hsl(var(--success))'
      }
    ];
  };

  const processarMapData = (fichas: any[]) => {
    // Simulação de dados de localização
    return [
      { lat: -23.5505, lon: -46.6333, fichas: 45, conversao: 85.5, endereco: 'Centro - São Paulo' },
      { lat: -23.5629, lon: -46.6544, fichas: 32, conversao: 72.3, endereco: 'Vila Madalena' },
      { lat: -23.5475, lon: -46.6361, fichas: 28, conversao: 68.1, endereco: 'Liberdade' },
      { lat: -23.5558, lon: -46.6396, fichas: 19, conversao: 55.2, endereco: 'Bela Vista' }
    ];
  };

  const processarDadosLocais = (fichas: any[]) => {
    const locais = fichas.reduce((acc: any, ficha: any) => {
      const local = ficha.Campo_Local || 'Local não informado';
      if (!acc[local]) {
        acc[local] = {
          fichas: 0,
          comFoto: 0,
          confirmadas: 0,
          scouters: new Set()
        };
      }
      
      acc[local].fichas++;
      if (ficha.tem_foto) acc[local].comFoto++;
      if (ficha.status_normalizado === 'Confirmado') acc[local].confirmadas++;
      acc[local].scouters.add(ficha.Gestao_de_Scouter);
      
      return acc;
    }, {});

    return Object.entries(locais).map(([local, stats]: [string, any]) => ({
      local,
      fichas: stats.fichas,
      percentFoto: (stats.comFoto / stats.fichas) * 100,
      percentConfirmacao: (stats.confirmadas / stats.fichas) * 100,
      scouters: Array.from(stats.scouters)
    })).sort((a, b) => b.fichas - a.fichas);
  };

  const processarDadosIntervalos = (fichas: any[]) => {
    const scouterIntervalos = fichas.reduce((acc: any, ficha: any) => {
      const scouter = ficha.Gestao_de_Scouter;
      if (!acc[scouter]) {
        acc[scouter] = {
          intervalos: [],
          curtos: 0,
          medios: 0,
          longos: 0
        };
      }
      
      // Simulação de intervalos
      const intervalo = Math.random() * 60; // 0-60 minutos
      acc[scouter].intervalos.push(intervalo);
      
      if (intervalo < 5) acc[scouter].curtos++;
      else if (intervalo <= 20) acc[scouter].medios++;
      else acc[scouter].longos++;
      
      return acc;
    }, {});

    return Object.entries(scouterIntervalos).map(([scouter, data]: [string, any]) => {
      const media = data.intervalos.reduce((a: number, b: number) => a + b, 0) / data.intervalos.length;
      const total = data.curtos + data.medios + data.longos;
      const percentCurtos = total > 0 ? (data.curtos / total) * 100 : 0;
      
      return {
        scouter,
        mediaMinutos: media,
        intervalos: {
          curtos: data.curtos,
          medios: data.medios,
          longos: data.longos
        },
        percentCurtos,
        eficiencia: percentCurtos >= 60 ? 'alta' : percentCurtos >= 30 ? 'media' : 'baixa'
      };
    }).sort((a, b) => b.percentCurtos - a.percentCurtos);
  };

  const processarDadosPipeline = (fichas: any[]) => {
    const projetos = fichas.reduce((acc: any, ficha: any) => {
      const projeto = ficha.Projetos_Comerciais;
      if (!acc[projeto]) {
        acc[projeto] = {
          aguardando: 0,
          confirmadas: 0,
          naoConfirmadas: 0,
          tempos: []
        };
      }
      
      switch (ficha.status_normalizado) {
        case 'Aguardando':
          acc[projeto].aguardando++;
          break;
        case 'Confirmado':
          acc[projeto].confirmadas++;
          acc[projeto].tempos.push(Math.random() * 72); // 0-72 horas
          break;
        case 'Não Confirmado':
          acc[projeto].naoConfirmadas++;
          break;
      }
      
      return acc;
    }, {});

    return Object.entries(projetos).map(([projeto, stats]: [string, any]) => {
      const total = stats.aguardando + stats.confirmadas + stats.naoConfirmadas;
      const taxaConversao = total > 0 ? (stats.confirmadas / total) * 100 : 0;
      const tempoMedio = stats.tempos.length > 0 ? 
        stats.tempos.reduce((a: number, b: number) => a + b, 0) / stats.tempos.length : 0;
      
      return {
        projeto,
        aguardando: stats.aguardando,
        confirmadas: stats.confirmadas,
        naoConfirmadas: stats.naoConfirmadas,
        total,
        taxaConversao,
        tempoMedioConfirmacao: tempoMedio
      };
    }).sort((a, b) => b.total - a.total);
  };

  const availableScouters = [...new Set(data.fichas.map((f: any) => f.Gestao_de_Scouter))].filter(Boolean) as string[];
  const availableProjects = [...new Set(data.fichas.map((f: any) => f.Projetos_Comerciais))].filter(Boolean) as string[];

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
        {/* Botão de Configurações */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Button>
        </div>

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
          <KPICard
            title="% Intervalos Curtos"
            value={`${(processedData.kpis?.percentIntervalosCurtos || 0).toFixed(1)}%`}
            icon={Zap}
            variant={processedData.kpis?.percentIntervalosCurtos >= 50 ? "success" : "warning"}
            isLoading={isLoading}
          />
          <KPICard
            title="Custo/Ficha Confirmada"
            value={`R$ ${(processedData.kpis?.custoFichaConfirmada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            variant="default"
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
          <KPICard
            title="ROI do Projeto"
            value={`${(processedData.kpis?.roiProjeto || 0).toFixed(2)}x`}
            icon={TrendingUp}
            variant={processedData.kpis?.roiProjeto >= 2 ? "success" : "warning"}
            isLoading={isLoading}
          />
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CustomBarChart
            title="Fichas por Scouter"
            data={processedData.charts?.fichasPorScouter || []}
            color="hsl(var(--primary))"
            isLoading={isLoading}
            showValues={true}
          />
          <CustomBarChart
            title="Fichas por Projeto"
            data={processedData.charts?.fichasPorProjeto || []}
            color="hsl(var(--success))"
            isLoading={isLoading}
            showValues={true}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <CustomLineChart
            title="Projeção vs Real (Acumulado)"
            data={processedData.charts?.projecaoVsReal || []}
            isLoading={isLoading}
          />
        </div>

        {/* Visualizações Avançadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HistogramChart
            title="Distribuição de Intervalos"
            data={processedData.charts?.histogramData || []}
            isLoading={isLoading}
          />
          <FunnelChart
            title="Funil de Status"
            data={processedData.charts?.funnelData || []}
            isLoading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <MapChart
            title="Mapa de Locais"
            data={processedData.charts?.mapData || []}
            isLoading={isLoading}
          />
        </div>

        {/* Tabelas Detalhadas */}
        <div className="grid grid-cols-1 gap-6">
          <ScouterTable
            data={processedData.tables?.scouters || []}
            isLoading={isLoading}
          />
          
          <ProjectTable
            data={processedData.tables?.projects || []}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LocationTable
              data={processedData.tables?.locations || []}
              isLoading={isLoading}
            />
            <IntervalTable
              data={processedData.tables?.intervals || []}
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineTable
              data={processedData.tables?.pipeline || []}
              isLoading={isLoading}
            />
            <AuditTable
              data={processedData.tables?.audit || []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Análise */}
        <AnalysisPanel
          filters={filters}
          data={processedData}
        />

        {/* Modal de Configurações */}
        <ConfigPanel
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onConfigUpdate={handleConfigUpdate}
          currentConfig={config}
        />
      </div>
    </div>
  );
};
