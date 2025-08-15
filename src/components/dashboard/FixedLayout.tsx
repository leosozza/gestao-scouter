
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { ScouterTable } from "./tables/ScouterTable";
import { ProjectTable } from "./tables/ProjectTable";
import { BarChart } from "./charts/BarChart";
import { LineChart } from "./charts/LineChart";
import { Loader2 } from "lucide-react";

interface FixedLayoutProps {
  processedData: any;
  isLoading: boolean;
  currentFilters: any;
  onLoadView: (view: any) => void;
  isEditMode: boolean;
  showSavedViews: boolean;
}

export const FixedLayout = ({ 
  processedData, 
  isLoading, 
  currentFilters, 
  onLoadView,
  isEditMode,
  showSavedViews 
}: FixedLayoutProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  if (!processedData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  const { kpis = {}, tables = {}, charts = {} } = processedData;

  return (
    <div className="p-6 space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Fichas"
          value={kpis.totalFichas || 0}
          icon="Users"
          trend={kpis.trendFichas}
        />
        <KPICard
          title="Receita Total"
          value={`R$ ${(kpis.receitaTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon="DollarSign"
          trend={kpis.trendReceita}
        />
        <KPICard
          title="Scouters Ativos"
          value={kpis.scoutersAtivos || 0}
          icon="UserCheck"
          trend={kpis.trendScouters}
        />
        <KPICard
          title="Projetos Ativos"
          value={kpis.projetosAtivos || 0}
          icon="Briefcase"
          trend={kpis.trendProjetos}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fichas por Scouter</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={charts.fichasPorScouter || []} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Evolução Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={charts.evolucaoTemporal || []} />
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes por Scouter</CardTitle>
          </CardHeader>
          <CardContent>
            <ScouterTable data={tables.scouters || []} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectTable data={tables.projetos || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
