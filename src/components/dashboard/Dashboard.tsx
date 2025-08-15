import { useState, useCallback } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { PanelLayout } from "./PanelLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardData, DashboardFilters } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";

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
          <PanelLayout 
            processedData={processedData}
            isLoading={isLoading}
            currentFilters={dashboardFilters}
            onLoadView={handleLoadView}
            isEditMode={isEditMode}
            showSavedViews={showSavedViews}
          />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <div className="flex flex-col space-y-4">
            <p>Tela de Controle Financeiro em desenvolvimento.</p>
            <Button>Teste</Button>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="flex flex-col space-y-4">
            <p>Tela de Upload de Dados em desenvolvimento.</p>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="flex flex-col space-y-4">
            <p>Tela de Integrações em desenvolvimento.</p>
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <div className="flex flex-col space-y-4">
            <p>Tela de Configurações em desenvolvimento.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
