
import React, { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ConfigPanel } from "@/components/dashboard/ConfigPanel";
import { PanelLayout } from "@/components/dashboard/PanelLayout";
import { useDashboardData } from "@/hooks/useDashboardData";

const Index: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('classico-corporativo');
  const [activePanel, setActivePanel] = useState<'overview' | 'performance' | 'financial'>('overview');
  
  const [config, setConfig] = useState({
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o/edit',
    ajudaCustoDiaria: 50.0,
    valorPorFicha: 15.0
  });

  const { processedData, isLoading, handleLoadView } = useDashboardData();

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleConfigUpdate = (newConfig: any) => {
    setConfig(newConfig);
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
  };

  const handlePanelChange = (panel: string) => {
    setActivePanel(panel as 'overview' | 'performance' | 'financial');
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Create mock filters for the PanelLayout
  const currentFilters = {
    dateRange: { start: '', end: '' },
    scouters: [],
    projects: []
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        onLogout={handleLogout}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode(!isEditMode)}
        showSavedViews={showSavedViews}
        onToggleSavedViews={() => setShowSavedViews(!showSavedViews)}
        selectedTheme={selectedTheme}
        onThemeChange={handleThemeChange}
        onOpenConfig={() => setShowConfigPanel(true)}
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
      />
      
      <PanelLayout 
        processedData={processedData}
        isLoading={isLoading}
        currentFilters={currentFilters}
        onLoadView={handleLoadView}
        isEditMode={isEditMode}
        showSavedViews={showSavedViews}
      />
      
      <ConfigPanel
        isOpen={showConfigPanel}
        onClose={() => setShowConfigPanel(false)}
        onConfigUpdate={handleConfigUpdate}
        currentConfig={config}
      />
    </div>
  );
};

export default Index;
