
import { DraggablePanel } from './DraggablePanel';
import { usePanelLayout } from '@/hooks/usePanelLayout';
import { KPICard } from './KPICard';
import { CustomBarChart } from './charts/BarChart';
import { CustomLineChart } from './charts/LineChart';
import { FunnelChart } from './charts/FunnelChart';
import { HistogramChart } from './charts/HistogramChart';
import { MapChart } from './charts/MapChart';
import { ScouterTable } from './tables/ScouterTable';
import { ProjectTable } from './tables/ProjectTable';
import { AuditTable } from './tables/AuditTable';
import { LocationTable } from './tables/LocationTable';
import { IntervalTable } from './tables/IntervalTable';
import { Button } from '@/components/ui/button';
import { RotateCcw, Settings, Plus } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Target, DollarSign, Camera, CheckCircle, Clock, Zap, TrendingUp, FileCheck, FileX } from 'lucide-react';

interface PanelLayoutProps {
  processedData: any;
  isLoading: boolean;
}

export const PanelLayout = ({ processedData, isLoading }: PanelLayoutProps) => {
  const {
    panels,
    allPanels,
    movePanel,
    resizePanel,
    togglePanelCollapse,
    togglePanelVisibility,
    removePanel,
    resetLayout
  } = usePanelLayout();

  const renderPanelContent = (component: string) => {
    switch (component) {
      case 'kpis-main':
        return (
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
        );

      case 'chart-scouter':
        return (
          <CustomBarChart
            title=""
            data={processedData.charts?.fichasPorScouter || []}
            color="hsl(var(--primary))"
            isLoading={isLoading}
            showValues={true}
          />
        );

      case 'chart-project':
        return (
          <CustomBarChart
            title=""
            data={processedData.charts?.fichasPorProjeto || []}
            color="hsl(var(--success))"
            isLoading={isLoading}
            showValues={true}
          />
        );

      case 'line-chart':
        return (
          <CustomLineChart
            title=""
            data={processedData.charts?.projecaoVsReal || []}
            isLoading={isLoading}
          />
        );

      case 'funnel-chart':
        return (
          <FunnelChart
            title=""
            data={processedData.charts?.funnelData || []}
            isLoading={isLoading}
          />
        );

      case 'histogram-chart':
        return (
          <HistogramChart
            title=""
            data={processedData.charts?.histogramData || []}
            isLoading={isLoading}
          />
        );

      case 'map-chart':
        return (
          <MapChart
            title=""
            data={processedData.charts?.mapData || []}
            isLoading={isLoading}
          />
        );

      case 'scouter-table':
        return (
          <ScouterTable
            data={processedData.tables?.scouters || []}
            isLoading={isLoading}
          />
        );

      case 'project-table':
        return (
          <ProjectTable
            data={processedData.tables?.projects || []}
            isLoading={isLoading}
          />
        );

      case 'audit-table':
        return (
          <AuditTable
            data={processedData.tables?.audit || []}
            isLoading={isLoading}
          />
        );

      case 'location-table':
        return (
          <LocationTable
            data={processedData.tables?.locations || []}
            isLoading={isLoading}
          />
        );

      case 'interval-table':
        return (
          <IntervalTable
            data={processedData.tables?.intervals || []}
            isLoading={isLoading}
          />
        );

      case 'kpis-secondary':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              title="ROI do Projeto"
              value={`${(processedData.kpis?.roiProjeto || 0).toFixed(2)}x`}
              icon={TrendingUp}
              variant={processedData.kpis?.roiProjeto >= 2 ? "success" : "warning"}
              isLoading={isLoading}
            />
          </div>
        );

      default:
        return <div className="p-4 text-center text-muted-foreground">Componente não encontrado: {component}</div>;
    }
  };

  const availablePanels = [
    { id: 'kpis-secondary', title: 'KPIs Secundários', component: 'kpis-secondary' },
    { id: 'histogram-chart', title: 'Distribuição de Intervalos', component: 'histogram-chart' },
    { id: 'map-chart', title: 'Mapa de Locais', component: 'map-chart' },
    { id: 'project-table', title: 'Tabela de Projetos', component: 'project-table' },
    { id: 'audit-table', title: 'Auditoria', component: 'audit-table' },
    { id: 'location-table', title: 'Tabela de Locais', component: 'location-table' },
    { id: 'interval-table', title: 'Tabela de Intervalos', component: 'interval-table' }
  ];

  const hiddenPanels = allPanels.filter(p => !p.visible);

  return (
    <div className="relative w-full min-h-screen bg-background/50">
      {/* Control bar */}
      <div className="fixed top-20 right-6 z-50 flex gap-2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Painel
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hiddenPanels.map(panel => (
              <DropdownMenuItem
                key={panel.id}
                onClick={() => togglePanelVisibility(panel.id)}
              >
                {panel.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {availablePanels
              .filter(available => !allPanels.some(p => p.id === available.id))
              .map(available => (
                <DropdownMenuItem
                  key={available.id}
                  onClick={() => {
                    const newPanel = {
                      ...available,
                      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
                      size: { width: 400, height: 300 },
                      isCollapsed: false,
                      visible: true
                    };
                    // Add to panels manually since we need to create a complete config
                  }}
                >
                  {available.title}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar Layout
        </Button>
      </div>

      {/* Panels */}
      {panels.map(panel => (
        <DraggablePanel
          key={panel.id}
          id={panel.id}
          title={panel.title}
          position={panel.position}
          size={panel.size}
          isCollapsed={panel.isCollapsed}
          onMove={movePanel}
          onResize={resizePanel}
          onToggleCollapse={togglePanelCollapse}
          onRemove={removePanel}
        >
          {renderPanelContent(panel.component)}
        </DraggablePanel>
      ))}
    </div>
  );
};
