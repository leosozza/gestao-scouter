
import { useState, useEffect } from 'react';
import { mockFichas, mockProjetos, mockMetasScouter } from '@/data/mockData';

export interface DashboardFilters {
  dateRange: { start: string; end: string };
  scouters: string[];
  projects: string[];
}

interface ProcessedData {
  kpis: {
    totalFichas: number;
    receitaTotal: number;
    scoutersAtivos: number;
    projetosAtivos: number;
    trendFichas?: { value: string; isPositive: boolean };
    trendReceita?: { value: string; isPositive: boolean };
    trendScouters?: { value: string; isPositive: boolean };
    trendProjetos?: { value: string; isPositive: boolean };
  };
  charts: {
    fichasPorScouter: Array<{ name: string; value: number }>;
    evolucaoTemporal: Array<{ name: string; value: number }>;
  };
  tables: {
    scouters: Array<{
      scouter: string;
      fichas: number;
      meta: number;
      progresso: number;
      receita: number;
    }>;
    projetos: Array<{
      projeto: string;
      fichas: number;
      meta: number;
      progresso: number;
      receita: number;
    }>;
  };
}

export const useDashboardData = () => {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const processData = () => {
    console.log('Processando dados do dashboard...');
    
    // Processa fichas por scouter
    const fichasPorScouter = mockFichas.reduce((acc, ficha) => {
      const scouter = ficha.Gestao_de_Scouter;
      acc[scouter] = (acc[scouter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Processa fichas por projeto
    const fichasPorProjeto = mockFichas.reduce((acc, ficha) => {
      const projeto = ficha.Projetos_Comerciais;
      acc[projeto] = (acc[projeto] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calcula receita total
    const receitaTotal = mockFichas.reduce((total, ficha) => {
      const valor = parseFloat(ficha.Valor_por_Fichas.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      return total + valor;
    }, 0);

    // Processa evolução temporal (últimos 7 dias)
    const evolucaoTemporal = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
      
      // Simula dados baseado na distribuição atual
      const totalFichas = mockFichas.length;
      const fichasDoDia = Math.floor(totalFichas / 7) + Math.floor(Math.random() * 20);
      
      evolucaoTemporal.push({
        name: dayName,
        value: fichasDoDia
      });
    }

    // Dados dos scouters
    const scoutersData = Object.entries(fichasPorScouter).map(([scouter, fichas]) => {
      const meta = mockMetasScouter.find(m => m.scouter === scouter)?.meta || 500;
      const progresso = (fichas / meta) * 100;
      const valorMedio = 6; // R$ médio por ficha
      const receita = fichas * valorMedio;

      return {
        scouter,
        fichas,
        meta,
        progresso: Math.min(progresso, 100),
        receita
      };
    });

    // Dados dos projetos
    const projetosData = Object.entries(fichasPorProjeto).map(([projeto, fichas]) => {
      const projetoInfo = mockProjetos.find(p => p.Agencia_e_Seletiva === projeto);
      const meta = projetoInfo?.Meta_de_Fichas || 1000;
      const progresso = (fichas / meta) * 100;
      const valorMedio = 6; // R$ médio por ficha
      const receita = fichas * valorMedio;

      return {
        projeto,
        fichas,
        meta,
        progresso: Math.min(progresso, 100),
        receita
      };
    });

    const processed: ProcessedData = {
      kpis: {
        totalFichas: mockFichas.length,
        receitaTotal,
        scoutersAtivos: Object.keys(fichasPorScouter).length,
        projetosAtivos: Object.keys(fichasPorProjeto).length,
        trendFichas: { value: '+12.5%', isPositive: true },
        trendReceita: { value: '+8.3%', isPositive: true },
        trendScouters: { value: '+5.2%', isPositive: true },
        trendProjetos: { value: '0%', isPositive: true }
      },
      charts: {
        fichasPorScouter: Object.entries(fichasPorScouter).map(([name, value]) => ({ name, value })),
        evolucaoTemporal
      },
      tables: {
        scouters: scoutersData,
        projetos: projetosData
      }
    };

    console.log('Dados processados:', processed);
    return processed;
  };

  const handleLoadView = (viewData: any) => {
    setIsLoading(true);
    // Simula loading
    setTimeout(() => {
      const processed = processData();
      setProcessedData(processed);
      setIsLoading(false);
    }, 1000);
  };

  // Carrega dados iniciais
  useEffect(() => {
    setIsLoading(true);
    
    // Simula carregamento inicial
    setTimeout(() => {
      const processed = processData();
      setProcessedData(processed);
      setIsLoading(false);
    }, 1500);
  }, []);

  return {
    processedData,
    isLoading,
    handleLoadView
  };
};
