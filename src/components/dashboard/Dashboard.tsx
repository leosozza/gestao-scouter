
import { useState, useCallback, useEffect } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { FixedLayout } from "./FixedLayout";
import { FinancialPanel } from "./FinancialPanel";
import { DataUploadPanel } from "./DataUploadPanel";
import { IntegrationsPanel } from "./integrations/IntegrationsPanel";
import { ConfigPanel } from "./ConfigPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData, DashboardFilters } from "@/hooks/useDashboardData";

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({
    dateRange: { start: new Date().toISOString(), end: new Date().toISOString() },
    scouters: [],
    projects: []
  });
  const { processedData, isLoading, handleLoadView } = useDashboardData();
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("classic");
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    spreadsheetUrl: '',
    ajudaCustoDiaria: 50,
    valorPorFicha: 15
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  const handleLogout = useCallback(() => {
    window.location.href = "/auth/sign-in";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        onLogout={handleLogout}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        showSavedViews={showSavedViews}
        onToggleSavedViews={() => setShowSavedViews(!showSavedViews)}
        selectedTheme={selectedTheme}
        onThemeChange={setSelectedTheme}
        onOpenConfig={() => setShowConfig(true)}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 mx-6 mt-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="financial">Controle Financeiro</TabsTrigger>
          <TabsTrigger value="upload">Upload de Dados</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <FixedLayout 
            processedData={processedData}
            isLoading={isLoading}
            currentFilters={dashboardFilters}
            onLoadView={handleLoadView}
            isEditMode={isEditMode}
            showSavedViews={showSavedViews}
          />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <FinancialPanel />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <DataUploadPanel />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationsPanel />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <div className="p-6">
            <ConfigPanel
              isOpen={true}
              onClose={() => {}}
              onConfigUpdate={setConfig}
              currentConfig={config}
            />
          </div>
        </TabsContent>
      </Tabs>

      {showConfig && (
        <ConfigPanel
          isOpen={showConfig}
          onClose={() => setShowConfig(false)}
          onConfigUpdate={setConfig}
          currentConfig={config}
        />
      )}
    </div>
  );
};
