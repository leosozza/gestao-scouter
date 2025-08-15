import { DraggablePanel } from './DraggablePanel';
import { usePanelLayout } from '@/hooks/usePanelLayout';
import { FilterPanel, DashboardFilters } from './FilterPanel';
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
import { RotateCcw, Plus, Zap } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Target, DollarSign, Camera, CheckCircle, Clock, TrendingUp, FileCheck, FileX, BarChart3 } from 'lucide-react';
import { SavedViews } from './SavedViews';

interface PanelLayoutProps {
  processedData: any;
  isLoading: boolean;
  currentFilters?: DashboardFilters;
  onLoadView?: (filters: DashboardFilters) => void;
  isEditMode: boolean;
  showSavedViews: boolean;
}

export const PanelLayout = ({ 
  processedData, 
  isLoading, 
  currentFilters, 
  onLoadView,
  isEditMode,
  showSavedViews 
}: PanelLayoutProps) => {
  const {
    panels,
    allPanels,
    movePanel,
    resizePanel,
    togglePanelCollapse,
    togglePanelVisibility,
    removePanel,
    resetLayout,
    autoOrganize,
    alignPanels,
    addPanel
  } = usePanelLayout();

  // Provide safe defaults for processedData
  const safeProcessedData = processedData || {
    kpis: {
      totalFichas: 0,
      fichasPagas: 0,
      fichasAPagar: 0,
      valorFichas: 0,
      ajudaCusto: 0,
      diasPagos: 0,
      percentFoto: 0,
      taxaConfirmacao: 0,
      intervaloMedio: 0,
      roiProjeto: 0
    },
    charts: {
      fichasPorScouter: [],
      fichasPorProjeto: [],
      projecaoVsReal: [],
      funnelData: [],
      histogramData: [],
      mapData: []
    },
    tables: {
      scouters: [],
      projects: [],
      audit: [],
      locations: [],
      intervals: []
    }
  };

  // Mock data for filters - this will be replaced with real data later
  const mockFilters: DashboardFilters = currentFilters || {
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    scouters: [],
    projects: []
  };

  const handleFiltersChange = (newFilters: DashboardFilters) => {
    console.log('Filters changed:', newFilters);
    if (onLoadView) {
      onLoadView(newFilters);
    }
  };

  const handleApplyFilters = () => {
    console.log('Applying filters...');
  };

  const handleClearFilters = () => {
    console.log('Clearing filters...');
  };

  const handleResetAll = () => {
    console.log('Resetting all filters...');
  };

  const renderPanelContent = (component: string) => {
    switch (component) {
      case 'kpis-fichas':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-2">
            <KPICard
              title="Total de Fichas"
              value={safeProcessedData.kpis?.totalFichas || 0}
              icon={Target}
              isLoading={isLoading}
            />
            <KPICard
              title="Fichas Pagas"
              value={safeProcessedData.kpis?.fichasPagas || 0}
              icon={FileCheck}
              variant="success"
              isLoading={isLoading}
            />
            <KPICard
              title="Fichas a Pagar"
              value={safeProcessedData.kpis?.fichasAPagar || 0}
              icon={FileX}
              variant="warning"
              isLoading={isLoading}
            />
            <KPICard
              title="Valor das Fichas"
              value={`R$ ${(safeProcessedData.kpis?.valorFichas || 0).toLocaleString('pt-BR')}`}
              icon={DollarSign}
              variant="success"
              isLoading={isLoading}
            />
          </div>
        );

      case 'kpis-ajuda':
        return (
          <div className="p-4">
            <KPICard
              title="Ajuda de Custo"
              value={`R$ ${(safeProcessedData.kpis?.ajudaCusto || 0).toLocaleString('pt-BR')}`}
              subtitle={`${safeProcessedData.kpis?.diasPagos || 0} dias pagos`}
              icon={DollarSign}
              variant="success"
              isLoading={isLoading}
            />
          </div>
        );

      case 'chart-scouter':
        return (
          <div className="p-2 h-full">
            <CustomBarChart
              title=""
              data={safeProcessedData.charts?.fichasPorScouter || []}
              color="hsl(var(--primary))"
              isLoading={isLoading}
              showValues={true}
            />
          </div>
        );

      case 'chart-project':
        return (
          <div className="p-2 h-full">
            <CustomBarChart
              title=""
              data={safeProcessedData.charts?.fichasPorProjeto || []}
              color="hsl(var(--success))"
              isLoading={isLoading}
              showValues={true}
            />
          </div>
        );

      case 'line-chart':
        return (
          <div className="p-2 h-full">
            <CustomLineChart
              title=""
              data={safeProcessedData.charts?.projecaoVsReal || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'funnel-chart':
        return (
          <div className="p-2 h-full">
            <FunnelChart
              title=""
              data={safeProcessedData.charts?.funnelData || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'histogram-chart':
        return (
          <div className="p-2 h-full">
            <HistogramChart
              title=""
              data={safeProcessedData.charts?.histogramData || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'map-chart':
        return (
          <div className="p-2 h-full">
            <MapChart
              title=""
              data={safeProcessedData.charts?.mapData || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'scouter-table':
        return (
          <div className="p-2 h-full overflow-auto">
            <ScouterTable
              data={safeProcessedData.tables?.scouters || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'project-table':
        return (
          <div className="p-2 h-full overflow-auto">
            <ProjectTable
              data={safeProcessedData.tables?.projects || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'audit-table':
        return (
          <div className="p-2 h-full overflow-auto">
            <AuditTable
              data={safeProcessedData.tables?.audit || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'location-table':
        return (
          <div className="p-2 h-full overflow-auto">
            <LocationTable
              data={safeProcessedData.tables?.locations || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'interval-table':
        return (
          <div className="p-2 h-full overflow-auto">
            <IntervalTable
              data={safeProcessedData.tables?.intervals || []}
              isLoading={isLoading}
            />
          </div>
        );

      case 'kpis-secondary':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-2">
            <KPICard
              title="% com Foto"
              value={`${(safeProcessedData.kpis?.percentFoto || 0).toFixed(1)}%`}
              icon={Camera}
              variant={safeProcessedData.kpis?.percentFoto >= 80 ? "success" : "warning"}
              isLoading={isLoading}
            />
            <KPICard
              title="Taxa de Confirmação"
              value={`${(safeProcessedData.kpis?.taxaConfirmacao || 0).toFixed(1)}%`}
              icon={CheckCircle}
              variant={safeProcessedData.kpis?.taxaConfirmacao >= 70 ? "success" : "warning"}
              isLoading={isLoading}
            />
            <KPICard
              title="Intervalo Médio"
              value={`${(safeProcessedData.kpis?.intervaloMedio || 0).toFixed(1)} min`}
              icon={Clock}
              variant={safeProcessedData.kpis?.intervaloMedio <= 8 ? "success" : "warning"}
              isLoading={isLoading}
            />
            <KPICard
              title="ROI do Projeto"
              value={`${(safeProcessedData.kpis?.roiProjeto || 0).toFixed(2)}x`}
              icon={TrendingUp}
              variant={safeProcessedData.kpis?.roiProjeto >= 2 ? "success" : "warning"}
              isLoading={isLoading}
            />
          </div>
        );

      case 'saved-views':
        return currentFilters && onLoadView ? (
          <div className="p-2 h-full">
            <SavedViews 
              currentFilters={currentFilters}
              onLoadView={onLoadView}
            />
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            Filtros não disponíveis
          </div>
        );

      case 'new-chart':
        return (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Novo tipo de gráfico</p>
            </div>
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
    { id: 'interval-table', title: 'Tabela de Intervalos', component: 'interval-table' },
    { id: 'saved-views', title: 'Visões Salvas', component: 'saved-views' },
    { id: 'new-chart', title: 'Novo Gráfico', component: 'new-chart' }
  ];

  const hiddenPanels = allPanels.filter(p => !p.visible);

  return (
    <div className="relative w-full min-h-screen bg-background/50">
      {/* Filter Panel - Fixed position at top left */}
      <div className="fixed top-20 left-6 z-40 w-80">
        <FilterPanel
          filters={mockFilters}
          onFiltersChange={handleFiltersChange}
          availableScouters={['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa']}
          availableProjects={['Projeto Alpha', 'Projeto Beta', 'Projeto Gamma', 'Projeto Delta']}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          onResetAll={handleResetAll}
        />
      </div>

      {/* Edit mode controls - Fixed position at top right */}
      {isEditMode && (
        <div className="fixed top-28 right-6 z-50 flex gap-2 bg-background/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
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
                      addPanel({
                        ...available,
                        position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
                        size: { width: 400, height: 300 },
                        isCollapsed: false,
                        visible: true
                      });
                    }}
                  >
                    {available.title}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Alinhar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => alignPanels('left')}>
                Alinhar à Esquerda
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignPanels('center')}>
                Centralizar Horizontalmente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignPanels('right')}>
                Alinhar à Direita
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alignPanels('top')}>
                Alinhar ao Topo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignPanels('middle')}>
                Centralizar Verticalmente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alignPanels('bottom')}>
                Alinhar à Base
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={autoOrganize}>
            <Zap className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={resetLayout}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Saved Views Panel - conditionally rendered */}
      {showSavedViews && currentFilters && onLoadView && (
        <div className="fixed top-20 right-6 z-40 w-80">
          <SavedViews 
            currentFilters={currentFilters}
            onLoadView={onLoadView}
          />
        </div>
      )}

      {/* Panels - adjusted to start after filter panel */}
      <div className="ml-96"> {/* Leave space for filter panel */}
        {panels.map(panel => (
          <DraggablePanel
            key={panel.id}
            id={panel.id}
            title={panel.title}
            position={panel.position}
            size={panel.size}
            isCollapsed={panel.isCollapsed}
            isEditMode={isEditMode}
            onMove={movePanel}
            onResize={resizePanel}
            onToggleCollapse={togglePanelCollapse}
            onRemove={isEditMode ? removePanel : undefined}
          >
            {renderPanelContent(panel.component)}
          </DraggablePanel>
        ))}
      </div>
    </div>
  );
};
