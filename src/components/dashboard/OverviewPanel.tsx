
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, FileText, DollarSign } from "lucide-react";
import { BeatLoader } from 'react-spinners';

interface OverviewPanelProps {
  isLoading: boolean;
  processedData?: {
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
  } | null;
}

export const OverviewPanel = ({ isLoading, processedData }: OverviewPanelProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <BeatLoader color="#4ade80" />
      </div>
    );
  }

  const kpis = processedData?.kpis || {
    totalFichas: 0,
    receitaTotal: 0,
    scoutersAtivos: 0,
    projetosAtivos: 0,
    trendFichas: { value: '0%', isPositive: true },
    trendReceita: { value: '0%', isPositive: true },
    trendScouters: { value: '0%', isPositive: true },
    trendProjetos: { value: '0%', isPositive: true }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Fichas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalFichas.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {kpis.trendFichas?.value || '0%'} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {kpis.receitaTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {kpis.trendReceita?.value || '0%'} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scouters Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.scoutersAtivos}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {kpis.trendScouters?.value || '0%'} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.projetosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.trendProjetos?.value || '0%'} este mês
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de visão geral do MaxFama. Aqui você pode acompanhar os principais indicadores do sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
