
import { useState, useEffect, useCallback } from 'react';

export interface PanelConfig {
  id: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isCollapsed: boolean;
  component: string;
  visible: boolean;
}

const STORAGE_KEY = 'maxfama_panel_layout_v2';

const DEFAULT_PANELS: PanelConfig[] = [
  {
    id: 'kpis-main',
    title: 'KPIs Principais',
    position: { x: 20, y: 20 },
    size: { width: 800, height: 200 },
    isCollapsed: false,
    component: 'kpis-main',
    visible: true
  },
  {
    id: 'charts-scouter',
    title: 'Fichas por Scouter',
    position: { x: 20, y: 240 },
    size: { width: 400, height: 300 },
    isCollapsed: false,
    component: 'chart-scouter',
    visible: true
  },
  {
    id: 'charts-project',
    title: 'Fichas por Projeto',
    position: { x: 440, y: 240 },
    size: { width: 400, height: 300 },
    isCollapsed: false,
    component: 'chart-project',
    visible: true
  },
  {
    id: 'line-chart',
    title: 'Projeção vs Real',
    position: { x: 20, y: 560 },
    size: { width: 820, height: 300 },
    isCollapsed: false,
    component: 'line-chart',
    visible: true
  },
  {
    id: 'funnel-chart',
    title: 'Funil de Status',
    position: { x: 860, y: 20 },
    size: { width: 350, height: 400 },
    isCollapsed: false,
    component: 'funnel-chart',
    visible: true
  },
  {
    id: 'scouter-table',
    title: 'Tabela de Scouters',
    position: { x: 20, y: 880 },
    size: { width: 800, height: 400 },
    isCollapsed: false,
    component: 'scouter-table',
    visible: true
  }
];

export const usePanelLayout = () => {
  const [panels, setPanels] = useState<PanelConfig[]>([]);

  // Load saved layout on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedPanels = JSON.parse(saved);
        // Merge with default panels to ensure we have all panels
        const mergedPanels = DEFAULT_PANELS.map(defaultPanel => {
          const savedPanel = parsedPanels.find((p: PanelConfig) => p.id === defaultPanel.id);
          return savedPanel ? { ...defaultPanel, ...savedPanel } : defaultPanel;
        });
        setPanels(mergedPanels);
      } catch (error) {
        console.error('Error loading panel layout:', error);
        setPanels(DEFAULT_PANELS);
      }
    } else {
      setPanels(DEFAULT_PANELS);
    }
  }, []);

  // Save layout whenever panels change
  useEffect(() => {
    if (panels.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    }
  }, [panels]);

  const updatePanel = useCallback((id: string, updates: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(panel => 
      panel.id === id ? { ...panel, ...updates } : panel
    ));
  }, []);

  const movePanel = useCallback((id: string, position: { x: number; y: number }) => {
    updatePanel(id, { position });
  }, [updatePanel]);

  const resizePanel = useCallback((id: string, size: { width: number; height: number }) => {
    updatePanel(id, { size });
  }, [updatePanel]);

  const togglePanelCollapse = useCallback((id: string) => {
    setPanels(prev => prev.map(panel => 
      panel.id === id ? { ...panel, isCollapsed: !panel.isCollapsed } : panel
    ));
  }, []);

  const togglePanelVisibility = useCallback((id: string) => {
    updatePanel(id, { visible: !panels.find(p => p.id === id)?.visible });
  }, [panels, updatePanel]);

  const removePanel = useCallback((id: string) => {
    updatePanel(id, { visible: false });
  }, [updatePanel]);

  const resetLayout = useCallback(() => {
    setPanels(DEFAULT_PANELS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const addPanel = useCallback((panelConfig: Omit<PanelConfig, 'id'> & { id?: string }) => {
    const id = panelConfig.id || `panel-${Date.now()}`;
    const newPanel: PanelConfig = {
      ...panelConfig,
      id,
      visible: true
    };
    setPanels(prev => [...prev, newPanel]);
  }, []);

  return {
    panels: panels.filter(p => p.visible),
    allPanels: panels,
    movePanel,
    resizePanel,
    togglePanelCollapse,
    togglePanelVisibility,
    removePanel,
    resetLayout,
    addPanel,
    updatePanel
  };
};
