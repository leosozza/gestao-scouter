
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { ScouterTable } from "./tables/ScouterTable";
import { ProjectTable } from "./tables/ProjectTable";
import { CustomBarChart } from "./charts/BarChart";
import { CustomLineChart } from "./charts/LineChart";
import { Loader2, Users, DollarSign, UserCheck, Briefcase } from "lucide-react";

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

  const { kpis = {}, charts = {}, tables = {} } = processedData;

  return (
    <div className="p-6 space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Fichas"
          value={kpis.totalFichas || 0}
          icon={Users}
          trend={kpis.trendFichas}
        />
        <KPICard
          title="Receita Total"
          value={`R$ ${(kpis.receitaTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend={kpis.trendReceita}
          variant="success"
        />
        <KPICard
          title="Scouters Ativos"
          value={kpis.scoutersAtivos || 0}
          icon={UserCheck}
          trend={kpis.trendScouters}
        />
        <KPICard
          title="Projetos Ativos"
          value={kpis.projetosAtivos || 0}
          icon={Briefcase}
          trend={kpis.trendProjetos}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomBarChart
          title="Fichas por Scouter"
          data={charts.fichasPorScouter || []}
          showValues={true}
        />
        
        <CustomLineChart
          title="Evolução Temporal (7 dias)"
          data={charts.evolucaoTemporal || []}
        />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance por Scouter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tables.scouters && tables.scouters.length > 0 ? (
                tables.scouters.map((scouter: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{scouter.scouter}</p>
                      <p className="text-sm text-muted-foreground">
                        {scouter.fichas} fichas / Meta: {scouter.meta}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        R$ {scouter.receita.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scouter.progresso.toFixed(1)}% da meta
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum scouter encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Projetos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tables.projetos && tables.projetos.length > 0 ? (
                tables.projetos.map((projeto: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{projeto.projeto}</p>
                      <p className="text-sm text-muted-foreground">
                        {projeto.fichas} fichas / Meta: {projeto.meta}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        R$ {projeto.receita.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {projeto.progresso.toFixed(1)}% da meta
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum projeto encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
