import { useState, useEffect } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { FilterPanel, DashboardFilters } from "./FilterPanel";
import { KPICard } from "./KPICard";
import { CustomBarChart } from "./charts/BarChart";
import { CustomLineChart } from "./charts/LineChart";
import { HistogramChart } from "./charts/HistogramChart";
import { FunnelChart } from "./charts/FunnelChart";
import { MapChart } from "./charts/MapChart";
import { AnalysisPanel } from "./AnalysisPanel";
import { SavedViews } from "./SavedViews";
import { ConfigPanel } from "./ConfigPanel";
import { FinancialControlPanel } from "./FinancialControlPanel";
import { ScouterTable } from "./tables/ScouterTable";
import { ProjectTable } from "./tables/ProjectTable";
import { AuditTable } from "./tables/AuditTable";
import { LocationTable } from "./tables/LocationTable";
import { IntervalTable } from "./tables/IntervalTable";
import { PipelineTable } from "./tables/PipelineTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, DollarSign, Calendar, TrendingUp, Users, AlertTriangle, Camera, CheckCircle, Clock, MapPin, Zap, Settings, CreditCard, FileCheck, FileX } from "lucide-react";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
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
    console.log('Dashboard: Iniciando carregamento de dados...');
    loadData();
  }, []);

  // Processar dados quando filtros mudam
  useEffect(() => {
    if (data.fichas && data.fichas.length > 0) {
      console.log('Dashboard: Processando dados com filtros...');
      processData();
    }
  }, [filters, data, config]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('Dashboard: Buscando dados do Google Sheets...');
      
      const [fichas, projetos, metas] = await Promise.all([
        GoogleSheetsService.fetchFichas().catch(err => {
          console.error('Erro ao buscar fichas:', err);
          return [];
        }),
        GoogleSheetsService.fetchProjetos().catch(err => {
          console.error('Erro ao buscar projetos:', err);
          return [];
        }),
        GoogleSheetsService.fetchMetasScouter().catch(err => {
          console.error('Erro ao buscar metas:', err);
          return [];
        })
      ]);

      console.log('Dashboard: Dados carregados:', { 
        fichas: fichas?.length || 0, 
        projetos: projetos?.length || 0, 
        metas: metas?.length || 0 
      });

      setData({ 
        fichas: fichas || [], 
        projetos: projetos || [], 
        metas: metas || [] 
      });
      
      if ((fichas?.length || 0) > 0) {
        toast({
          title: "Dados carregados",
          description: `${fichas.length} fichas, ${projetos?.length || 0} projetos carregados`
        });
      } else {
        toast({
          title: "Nenhum dado encontrado",
          description: "Verifique a configuração da planilha",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Dashboard: Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Verifique a conexão com a planilha",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar campo "Ficha paga" na planilha
  const updateFichaPagaStatus = async (fichaIds: string[], status: 'Sim' | 'Não' = 'Sim') => {
    try {
      console.log('Dashboard: Atualizando status de Ficha paga para fichas:', fichaIds);
      // Aqui seria implementada a atualização na planilha via API do Google Sheets
      // Por enquanto, apenas simulamos a atualização localmente
      
      const updatedFichas = data.fichas.map((ficha: any) => {
        if (fichaIds.includes(ficha.ID?.toString())) {
          return { ...ficha, 'Ficha paga': status };
        }
        return ficha;
      });
      
      setData({ ...data, fichas: updatedFichas });
      
      toast({
        title: "Status atualizado",
        description: `${fichaIds.length} fichas marcadas como ${status === 'Sim' ? 'pagas' : 'não pagas'}`
      });
    } catch (error) {
      console.error('Erro ao atualizar status de Ficha paga:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o status das fichas",
        variant: "destructive"
      });
    }
  };

  const processData = () => {
    try {
      console.log('Dashboard: Iniciando processamento de dados...');
      let filteredFichas = [...(data.fichas || [])];
      
      console.log('Dashboard: Total de fichas antes dos filtros:', filteredFichas.length);
      
      // Se não há filtros específicos selecionados, mostrar todos os dados
      const hasActiveFilters = filters.scouters.length > 0 || filters.projects.length > 0;
      
      if (hasActiveFilters) {
        console.log('Dashboard: Aplicando filtros específicos...');
        filteredFichas = filteredFichas.filter((ficha: any) => {
          const scouterMatch = filters.scouters.length === 0 || 
            filters.scouters.includes(ficha['Gestão de Scouter']);
          const projectMatch = filters.projects.length === 0 || 
            filters.projects.includes(ficha['Projetos Cormeciais']);
          
          return scouterMatch && projectMatch;
        });
      }
      
      // Aplicar filtro de data usando a coluna "Criado"
      if (filters.dateRange.start && filters.dateRange.end) {
        console.log('Dashboard: Aplicando filtro de data na coluna "Criado"...');
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end + 'T23:59:59');
        
        filteredFichas = filteredFichas.filter((ficha: any) => {
          const dataCriado = ficha.Criado;
          if (!dataCriado) return true; // Se não tem data, inclui
          
          // Parse da data no formato DD/MM/YYYY
          let fichaDate;
          if (typeof dataCriado === 'string' && dataCriado.includes('/')) {
            const [day, month, year] = dataCriado.split('/');
            fichaDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            fichaDate = new Date(dataCriado);
          }
          
          return fichaDate >= startDate && fichaDate <= endDate;
        });
      }

      console.log('Dashboard: Fichas após filtros:', filteredFichas.length);

      // KPIs principais
      const totalFichas = filteredFichas.length;
      const diasPagos = calcularDiasPagos(filteredFichas);
      const ajudaCusto = diasPagos * config.ajudaCustoDiaria;
      const pagamentoPorFichas = calcularPagamentoPorFichas(filteredFichas);
      const metaProgress = calcularProgressoMeta(filteredFichas);

      // KPIs baseados na coluna "Ficha paga"
      const fichasPagas = calcularFichasPagas(filteredFichas);
      const fichasAPagar = calcularFichasAPagar(filteredFichas);
      const valorFichasPagas = calcularValorFichasPagas(filteredFichas);
      const valorFichasAPagar = calcularValorFichasAPagar(filteredFichas);

      // Outros KPIs existentes
      const percentFoto = calcularPercentFoto(filteredFichas);
      const taxaConfirmacao = calcularTaxaConfirmacao(filteredFichas);
      const intervaloMedio = calcularIntervaloMedio(filteredFichas);
      const custoFichaConfirmada = calcularCustoFichaConfirmada(filteredFichas, ajudaCusto, pagamentoPorFichas);
      const percentIntervalosCurtos = calcularPercentIntervalosCurtos(filteredFichas);
      const roiProjeto = calcularROIProjeto(filteredFichas, ajudaCusto, pagamentoPorFichas);

      // Dados para gráficos
      const fichasPorScouter = processarFichasPorScouter(filteredFichas);
      const fichasPorProjeto = processarFichasPorProjeto(filteredFichas);

      // Dados para tabelas
      const scouterTableData = processarDadosScouters(filteredFichas);
      const projectTableData = processarDadosProjetos(filteredFichas);
      const auditTableData = processarDadosAuditoria(filteredFichas);
      const locationTableData = processarDadosLocais(filteredFichas);
      const intervalTableData = processarDadosIntervalos(filteredFichas);
      const pipelineTableData = processarDadosPipeline(filteredFichas);

      const newProcessedData = {
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
          roiProjeto,
          fichasPagas,
          fichasAPagar,
          valorFichasPagas,
          valorFichasAPagar
        },
        charts: {
          fichasPorScouter,
          fichasPorProjeto,
          projecaoVsReal: processarProjecaoVsReal(filteredFichas),
          histogramData: processarHistogramIntervalos(filteredFichas),
          funnelData: processarFunnelEtapas(filteredFichas), // Usar coluna "Etapa"
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
        filteredFichas,
        updateFichaPagaStatus // Disponibilizar função para outros componentes
      };

      console.log('Dashboard: Dados processados com sucesso:', {
        totalFichas: newProcessedData.kpis.totalFichas,
        fichasPagas: newProcessedData.kpis.fichasPagas,
        fichasAPagar: newProcessedData.kpis.fichasAPagar,
        fichasPorScouter: newProcessedData.charts.fichasPorScouter.length,
        fichasPorProjeto: newProcessedData.charts.fichasPorProjeto.length
      });
      
      setProcessedData(newProcessedData);
    } catch (error) {
      console.error('Dashboard: Erro ao processar dados:', error);
      toast({
        title: "Erro ao processar dados",
        description: "Ocorreu um erro no processamento dos dados",
        variant: "destructive"
      });
    }
  };

  // Atualizado para usar a coluna "Ficha paga"
  const calcularFichasPagas = (fichas: any[]) => {
    return fichas.filter(f => f['Ficha paga'] === 'Sim').length;
  };

  const calcularFichasAPagar = (fichas: any[]) => {
    return fichas.filter(f => f['Ficha paga'] !== 'Sim').length;
  };

  const calcularValorFichasPagas = (fichas: any[]) => {
    const fichasPagas = fichas.filter(f => f['Ficha paga'] === 'Sim');
    return fichasPagas.reduce((total, ficha) => {
      const valor = parseFloat(ficha['Valor por Fichas'] || config.valorPorFicha);
      return total + (isNaN(valor) ? config.valorPorFicha : valor);
    }, 0);
  };

  const calcularValorFichasAPagar = (fichas: any[]) => {
    const fichasAPagar = fichas.filter(f => f['Ficha paga'] !== 'Sim');
    return fichasAPagar.reduce((total, ficha) => {
      const valor = parseFloat(ficha['Valor por Fichas'] || config.valorPorFicha);
      return total + (isNaN(valor) ? config.valorPorFicha : valor);
    }, 0);
  };

  const calcularPercentFoto = (fichas: any[]) => {
    if (fichas.length === 0) return 0;
    const comFoto = fichas.filter(f => f['Cadastro Existe Foto?'] === 'SIM').length;
    return (comFoto / fichas.length) * 100;
  };

  const calcularTaxaConfirmacao = (fichas: any[]) => {
    if (fichas.length === 0) return 0;
    const confirmadas = fichas.filter(f => f['Ficha confirmada'] === 'Confirmado').length;
    return (confirmadas / fichas.length) * 100;
  };

  const calcularIntervaloMedio = (fichas: any[]) => {
    if (fichas.length <= 1) return 0;
    
    // Calcular intervalos baseado na coluna "Data de criação da Ficha"
    const fichasComData = fichas.filter(f => f['Data de criação da Ficha']).sort((a, b) => {
      const dateA = new Date(a['Data de criação da Ficha']);
      const dateB = new Date(b['Data de criação da Ficha']);
      return dateA.getTime() - dateB.getTime();
    });
    
    if (fichasComData.length <= 1) return 0;
    
    let totalIntervalos = 0;
    let countIntervalos = 0;
    
    for (let i = 1; i < fichasComData.length; i++) {
      const dataAtual = new Date(fichasComData[i]['Data de criação da Ficha']);
      const dataAnterior = new Date(fichasComData[i-1]['Data de criação da Ficha']);
      const intervalMinutos = (dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60);
      
      if (intervalMinutos > 0 && intervalMinutos < 1440) { // Máximo 24h
        totalIntervalos += intervalMinutos;
        countIntervalos++;
      }
    }
    
    return countIntervalos > 0 ? totalIntervalos / countIntervalos : 0;
  };

  const calcularCustoFichaConfirmada = (fichas: any[], ajudaCusto: number, pagamentoPorFichas: number) => {
    const confirmadas = fichas.filter(f => f['Ficha confirmada'] === 'Confirmado').length;
    if (confirmadas === 0) return 0;
    return (ajudaCusto + pagamentoPorFichas) / confirmadas;
  };

  const calcularPercentIntervalosCurtos = (fichas: any[]) => {
    if (fichas.length <= 1) return 0;
    
    const fichasComData = fichas.filter(f => f['Data de criação da Ficha']).sort((a, b) => {
      const dateA = new Date(a['Data de criação da Ficha']);
      const dateB = new Date(b['Data de criação da Ficha']);
      return dateA.getTime() - dateB.getTime();
    });
    
    if (fichasComData.length <= 1) return 0;
    
    let intervalos = [];
    for (let i = 1; i < fichasComData.length; i++) {
      const dataAtual = new Date(fichasComData[i]['Data de criação da Ficha']);
      const dataAnterior = new Date(fichasComData[i-1]['Data de criação da Ficha']);
      const intervalMinutos = (dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60);
      
      if (intervalMinutos > 0 && intervalMinutos < 1440) {
        intervalos.push(intervalMinutos);
      }
    }
    
    const curtos = intervalos.filter(i => i < 5).length;
    return intervalos.length > 0 ? (curtos / intervalos.length) * 100 : 0;
  };

  const calcularROIProjeto = (fichas: any[], ajudaCusto: number, pagamentoPorFichas: number) => {
    const receita = fichas.length * 50;
    const custo = ajudaCusto + pagamentoPorFichas;
    return custo > 0 ? receita / custo : 0;
  };

  const calcularDiasPagos = (fichas: any[]) => {
    const fichasPorScouterPorDia = fichas.reduce((acc, ficha) => {
      // Usar a coluna "Criado" para calcular dias pagos
      const dataStr = ficha.Criado;
      let date;
      
      if (dataStr && typeof dataStr === 'string' && dataStr.includes('/')) {
        const [day, month, year] = dataStr.split('/');
        date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        date = new Date().toISOString().split('T')[0];
      }
      
      const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
      const key = `${date}-${scouter}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.values(fichasPorScouterPorDia).filter((count: any) => count >= 20).length;
  };

  const calcularPagamentoPorFichas = (fichas: any[]) => {
    return fichas.reduce((total, ficha) => {
      const valor = parseFloat(ficha['Valor por Fichas'] || config.valorPorFicha);
      return total + (isNaN(valor) ? config.valorPorFicha : valor);
    }, 0);
  };

  const calcularProgressoMeta = (fichas: any[]) => {
    if (filters.projects.length === 1) {
      const projeto = data.projetos.find((p: any) => 
        p['agencia e seletiva'] === filters.projects[0]
      );
      if (projeto) {
        const meta = projeto['Meta de fichas'] || 1000;
        return Math.round((fichas.length / meta) * 100);
      }
    }
    return null;
  };

  const calcularRitmoNecessario = (fichas: any[]) => {
    if (filters.projects.length === 1) {
      const projeto = data.projetos.find((p: any) => 
        p['agencia e seletiva'] === filters.projects[0]
      );
      if (projeto) {
        const termino = projeto['Termino Captação fichas'];
        const meta = projeto['Meta de fichas'] || 1000;
        
        if (termino) {
          let terminoDate;
          if (termino.includes('/')) {
            const [day, month, year] = termino.split('/');
            terminoDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            terminoDate = new Date(termino);
          }
          
          const diasRestantes = Math.max(1, Math.ceil((terminoDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          const fichasRestantes = meta - fichas.length;
          return Math.ceil(fichasRestantes / diasRestantes);
        }
      }
    }
    return null;
  };

  const processarFichasPorScouter = (fichas: any[]) => {
    const counts = fichas.reduce((acc, ficha) => {
      const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
      acc[scouter] = (acc[scouter] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const processarFichasPorProjeto = (fichas: any[]) => {
    const counts = fichas.reduce((acc, ficha) => {
      const projeto = ficha['Projetos Cormeciais'] || 'Sem Projeto';
      acc[projeto] = (acc[projeto] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  };

  const processarProjecaoVsReal = (fichas: any[]) => {
    const days = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2025, 7, i + 1);
      const esperado = (i + 1) * 32;
      const real = fichas.filter(f => {
        const dataCriado = f.Criado;
        if (!dataCriado) return false;
        
        let fichaDate;
        if (typeof dataCriado === 'string' && dataCriado.includes('/')) {
          const [day, month, year] = dataCriado.split('/');
          fichaDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          fichaDate = new Date(dataCriado);
        }
        
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
    if (fichas.length <= 1) return [];
    
    const fichasComData = fichas.filter(f => f['Data de criação da Ficha']).sort((a, b) => {
      const dateA = new Date(a['Data de criação da Ficha']);
      const dateB = new Date(b['Data de criação da Ficha']);
      return dateA.getTime() - dateB.getTime();
    });
    
    const intervalos = [];
    for (let i = 1; i < fichasComData.length; i++) {
      const dataAtual = new Date(fichasComData[i]['Data de criação da Ficha']);
      const dataAnterior = new Date(fichasComData[i-1]['Data de criação da Ficha']);
      const intervalMinutos = (dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60);
      
      if (intervalMinutos > 0 && intervalMinutos < 1440) {
        intervalos.push(intervalMinutos);
      }
    }
    
    const buckets = [
      { bucket: '<5min', min: 0, max: 5 },
      { bucket: '5-10min', min: 5, max: 10 },
      { bucket: '10-20min', min: 10, max: 20 },
      { bucket: '20-40min', min: 20, max: 40 },
      { bucket: '>40min', min: 40, max: Infinity }
    ];
    
    return buckets.map(({ bucket, min, max }) => {
      const count = intervalos.filter(i => i >= min && i < max).length;
      const percentage = intervalos.length > 0 ? (count / intervalos.length) * 100 : 0;
      return { bucket, count, percentage };
    });
  };

  // Atualizado para usar a coluna "Etapa"
  const processarFunnelEtapas = (fichas: any[]) => {
    const etapas = fichas.reduce((acc, ficha) => {
      const etapa = ficha.Etapa || 'Sem Etapa';
      acc[etapa] = (acc[etapa] || 0) + 1;
      return acc;
    }, {});
    
    const total = fichas.length;
    
    return Object.entries(etapas)
      .map(([name, value]) => ({
        name,
        value: value as number,
        percentage: total > 0 ? ((value as number) / total) * 100 : 0,
        color: getEtapaColor(name)
      }))
      .sort((a, b) => b.value - a.value);
  };

  const getEtapaColor = (etapa: string) => {
    const colorMap: Record<string, string> = {
      'Lead a Qualificar': 'hsl(var(--warning))',
      'Qualificado': 'hsl(var(--primary))',
      'Agendado': 'hsl(var(--info))',
      'Confirmado': 'hsl(var(--success))',
      'Cancelado': 'hsl(var(--destructive))',
      'Não Qualificado': 'hsl(var(--muted))'
    };
    
    return colorMap[etapa] || 'hsl(var(--primary))';
  };

  const processarMapData = (fichas: any[]) => {
    return [
      { lat: -23.5505, lon: -46.6333, fichas: 45, conversao: 85.5, endereco: 'Centro - São Paulo' },
      { lat: -23.5629, lon: -46.6544, fichas: 32, conversao: 72.3, endereco: 'Vila Madalena' },
      { lat: -23.5475, lon: -46.6361, fichas: 28, conversao: 68.1, endereco: 'Liberdade' },
      { lat: -23.5558, lon: -46.6396, fichas: 19, conversao: 55.2, endereco: 'Bela Vista' }
    ];
  };

  const processarDadosScouters = (fichas: any[]) => {
    const scouterStats = fichas.reduce((acc, ficha) => {
      const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
      if (!acc[scouter]) {
        acc[scouter] = {
          fichas: 0,
          valor: 0,
          diasTrabalhados: new Set(),
          comFoto: 0,
          confirmadas: 0,
          pagas: 0
        };
      }
      
      acc[scouter].fichas++;
      const valor = parseFloat(ficha['Valor por Fichas'] || 0);
      acc[scouter].valor += isNaN(valor) ? 0 : valor;
      
      const dataStr = ficha.Criado;
      if (dataStr) {
        let date;
        if (typeof dataStr === 'string' && dataStr.includes('/')) {
          const [day, month, year] = dataStr.split('/');
          date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          date = new Date(dataStr).toISOString().split('T')[0];
        }
        acc[scouter].diasTrabalhados.add(date);
      }
      
      if (ficha['Cadastro Existe Foto?'] === 'SIM') acc[scouter].comFoto++;
      if (ficha['Ficha confirmada'] === 'Confirmado') acc[scouter].confirmadas++;
      if (ficha['Ficha paga'] === 'Sim') acc[scouter].pagas++;
      
      return acc;
    }, {});

    return Object.entries(scouterStats).map(([scouter, stats]: [string, any]) => {
      const diasPagos = Math.floor(stats.fichas / 20);
      const ajudaCusto = diasPagos * 30;
      
      return {
        scouter,
        fichas: stats.fichas,
        fichasPagas: stats.pagas,
        mediaDia: stats.fichas / Math.max(1, stats.diasTrabalhados.size),
        diasPagos,
        ajudaCusto,
        pagamentoFichas: stats.valor,
        total: ajudaCusto + stats.valor,
        percentFoto: stats.fichas > 0 ? (stats.comFoto / stats.fichas) * 100 : 0,
        percentConfirmacao: stats.fichas > 0 ? (stats.confirmadas / stats.fichas) * 100 : 0,
        percentPagas: stats.fichas > 0 ? (stats.pagas / stats.fichas) * 100 : 0,
        score: Math.min(100, (stats.fichas / 10) + (stats.fichas > 0 ? (stats.comFoto / stats.fichas * 50) + (stats.confirmadas / stats.fichas * 30) : 0))
      };
    }).sort((a, b) => b.score - a.score);
  };

  const processarDadosProjetos = (fichas: any[]) => {
    const projectStats = fichas.reduce((acc, ficha) => {
      const projeto = ficha['Projetos Cormeciais'] || 'Sem Projeto';
      if (!acc[projeto]) {
        acc[projeto] = { fichas: 0, valor: 0, pagas: 0 };
      }
      acc[projeto].fichas++;
      const valor = parseFloat(ficha['Valor por Fichas'] || 0);
      acc[projeto].valor += isNaN(valor) ? 0 : valor;
      if (ficha['Ficha paga'] === 'Sim') acc[projeto].pagas++;
      return acc;
    }, {});

    return Object.entries(projectStats).map(([projeto, stats]: [string, any]) => {
      const meta = 1000;
      const esperado = 500;
      const delta = stats.fichas - esperado;
      
      return {
        projeto,
        meta,
        progresso: stats.fichas,
        esperado,
        delta,
        pagas: stats.pagas,
        percentPagas: stats.fichas > 0 ? (stats.pagas / stats.fichas) * 100 : 0,
        status: delta >= 0 ? 'on-track' : delta > -100 ? 'warning' : 'critical',
        roi: stats.valor / 1000,
        percentConcluido: (stats.fichas / meta) * 100
      };
    });
  };

  const processarDadosAuditoria = (fichas: any[]) => {
    const problemas = [];
    
    fichas.slice(0, 10).forEach(ficha => {
      if (ficha['Cadastro Existe Foto?'] !== 'SIM') {
        problemas.push({
          id: ficha.ID?.toString() || Math.random().toString(),
          scouter: ficha['Gestão de Scouter'] || 'Sem Scouter',
          projeto: ficha['Projetos Cormeciais'] || 'Sem Projeto',
          dataFicha: ficha.Criado || 'N/A',
          problema: 'Sem foto',
          severidade: 'medium' as const,
          detalhes: 'Ficha cadastrada sem foto anexada'
        });
      }
    });

    return problemas;
  };

  const processarDadosLocais = (fichas: any[]) => {
    const locais = fichas.reduce((acc: any, ficha: any) => {
      const local = ficha['Local da Abordagem'] || 'Local não informado';
      if (!acc[local]) {
        acc[local] = {
          fichas: 0,
          comFoto: 0,
          confirmadas: 0,
          pagas: 0,
          scouters: new Set()
        };
      }
      
      acc[local].fichas++;
      if (ficha['Cadastro Existe Foto?'] === 'SIM') acc[local].comFoto++;
      if (ficha['Ficha confirmada'] === 'Confirmado') acc[local].confirmadas++;
      if (ficha['Ficha paga'] === 'Sim') acc[local].pagas++;
      acc[local].scouters.add(ficha['Gestão de Scouter']);
      
      return acc;
    }, {});

    return Object.entries(locais).map(([local, stats]: [string, any]) => ({
      local,
      fichas: stats.fichas,
      percentFoto: stats.fichas > 0 ? (stats.comFoto / stats.fichas) * 100 : 0,
      percentConfirmacao: stats.fichas > 0 ? (stats.confirmadas / stats.fichas) * 100 : 0,
      percentPagas: stats.fichas > 0 ? (stats.pagas / stats.fichas) * 100 : 0,
      scouters: Array.from(stats.scouters)
    })).sort((a, b) => b.fichas - a.fichas);
  };

  const processarDadosIntervalos = (fichas: any[]) => {
    const scouterIntervalos = fichas.reduce((acc: any, ficha: any, index: number) => {
      const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
      if (!acc[scouter]) {
        acc[scouter] = {
          intervalos: [],
          curtos: 0,
          medios: 0,
          longos: 0
        };
      }
      
      // Calcular intervalo baseado na "Data de criação da Ficha"
      if (index > 0 && ficha['Data de criação da Ficha'] && fichas[index-1]['Data de criação da Ficha']) {
        const dataAtual = new Date(ficha['Data de criação da Ficha']);
        const dataAnterior = new Date(fichas[index-1]['Data de criação da Ficha']);
        const intervalo = (dataAtual.getTime() - dataAnterior.getTime()) / (1000 * 60); // em minutos
        
        if (intervalo > 0 && intervalo < 1440) { // Máximo 24h
          acc[scouter].intervalos.push(intervalo);
          
          if (intervalo < 5) acc[scouter].curtos++;
          else if (intervalo <= 20) acc[scouter].medios++;
          else acc[scouter].longos++;
        }
      }
      
      return acc;
    }, {});

    return Object.entries(scouterIntervalos).map(([scouter, data]: [string, any]) => {
      const media = data.intervalos.length > 0 ? data.intervalos.reduce((a: number, b: number) => a + b, 0) / data.intervalos.length : 0;
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
      const projeto = ficha['Projetos Cormeciais'] || 'Sem Projeto';
      if (!acc[projeto]) {
        acc[projeto] = {
          etapas: {},
          confirmadas: 0,
          naoConfirmadas: 0,
          pagas: 0,
          tempos: []
        };
      }
      
      // Usar coluna "Etapa" para pipeline
      const etapa = ficha.Etapa || 'Sem Etapa';
      acc[projeto].etapas[etapa] = (acc[projeto].etapas[etapa] || 0) + 1;
      
      const status = ficha['Ficha confirmada'];
      if (status === 'Confirmado') {
        acc[projeto].confirmadas++;
        acc[projeto].tempos.push(Math.random() * 72); // Placeholder para tempo de confirmação
      } else if (status === 'Não Confirmado') {
        acc[projeto].naoConfirmadas++;
      }
      
      if (ficha['Ficha paga'] === 'Sim') {
        acc[projeto].pagas++;
      }
      
      return acc;
    }, {});

    return Object.entries(projetos).map(([projeto, stats]: [string, any]) => {
      const totalEtapas = Object.values(stats.etapas).reduce((a: number, b: number) => a + b, 0);
      const total = stats.confirmadas + stats.naoConfirmadas + Math.max(0, totalEtapas - stats.confirmadas - stats.naoConfirmadas);
      const taxaConversao = total > 0 ? (stats.confirmadas / total) * 100 : 0;
      const tempoMedio = stats.tempos.length > 0 ? 
        stats.tempos.reduce((a: number, b: number) => a + b, 0) / stats.tempos.length : 0;
      
      return {
        projeto,
        etapas: stats.etapas,
        confirmadas: stats.confirmadas,
        naoConfirmadas: stats.naoConfirmadas,
        pagas: stats.pagas,
        total,
        taxaConversao,
        percentPagas: total > 0 ? (stats.pagas / total) * 100 : 0,
        tempoMedioConfirmacao: tempoMedio
      };
    }).sort((a, b) => b.total - a.total);
  };

  const availableScouters = [...new Set((data.fichas || []).map((f: any) => 
    f['Gestão de Scouter']
  ).filter(Boolean))] as string[];
  
  const availableProjects = [...new Set((data.fichas || []).map((f: any) => 
    f['Projetos Cormeciais']
  ).filter(Boolean))] as string[];

  const handleConfigUpdate = (newConfig: any) => {
    setConfig(newConfig);
    if (newConfig.spreadsheetUrl !== config.spreadsheetUrl) {
      loadData();
    }
  };

  const handleResetAll = () => {
    const defaultFilters: DashboardFilters = {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      scouters: [],
      projects: []
    };
    setFilters(defaultFilters);
    
    localStorage.removeItem('maxfama_dashboard_views');
    localStorage.removeItem('maxfama_layout_v1');
    
    loadData();
    
    toast({
      title: "Sistema redefinido",
      description: "Todos os filtros, visões e layouts foram limpos"
    });
  };

  const handleApplyFilters = () => {
    toast({
      title: "Filtros aplicados",
      description: "Dashboard atualizado com os novos filtros"
    });
  };

  const handleClearFilters = () => {
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      scouters: [],
      projects: []
    });
    
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
      
      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="financial">Controle Financeiro</TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Debug Info */}
            {!isLoading && (
              <Card className="p-4 bg-muted/50">
                <div className="text-sm text-muted-foreground">
                  <strong>Debug:</strong> Total fichas: {data.fichas?.length || 0} | 
                  Fichas filtradas: {processedData.kpis?.totalFichas || 0} | 
                  Fichas pagas: {processedData.kpis?.fichasPagas || 0} | 
                  Fichas a pagar: {processedData.kpis?.fichasAPagar || 0} | 
                  Scouters disponíveis: {availableScouters.length} | 
                  Projetos disponíveis: {availableProjects.length}
                </div>
              </Card>
            )}

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
                  onResetAll={handleResetAll}
                />
              </div>

              <div className="lg:col-span-2">
                <SavedViews
                  currentFilters={filters}
                  onLoadView={handleLoadView}
                />
              </div>
            </div>

            {/* KPIs - Linha 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total de Fichas"
                value={processedData.kpis?.totalFichas || 0}
                icon={Target}
                isLoading={isLoading}
              />
              <KPICard
                title="Fichas Pagas"
                value={processedData.kpis?.fichasPagas || 0}
                icon={FileCheck}
                variant="success"
                isLoading={isLoading}
              />
              <KPICard
                title="Fichas a Pagar"
                value={processedData.kpis?.fichasAPagar || 0}
                icon={FileX}
                variant="warning"
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
            </div>

            {/* KPIs - Linha 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Valor Fichas Pagas"
                value={`R$ ${(processedData.kpis?.valorFichasPagas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                variant="success"
                isLoading={isLoading}
              />
              <KPICard
                title="Valor a Pagar"
                value={`R$ ${(processedData.kpis?.valorFichasAPagar || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                variant="warning"
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
            </div>

            {/* KPIs - Linha 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <FunnelChart
                title="Funil por Etapas"
                data={processedData.charts?.funnelData || []}
                isLoading={isLoading}
              />
              <HistogramChart
                title="Distribuição de Intervalos"
                data={processedData.charts?.histogramData || []}
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
          </TabsContent>

          <TabsContent value="financial">
            <FinancialControlPanel
              fichas={data.fichas || []}
              projetos={data.projetos || []}
              selectedPeriod={filters.dateRange ? {
                start: filters.dateRange.start,
                end: filters.dateRange.end
              } : null}
              onUpdateFichaPaga={updateFichaPagaStatus}
            />
          </TabsContent>
        </Tabs>

        {/* Modais */}
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
