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

const STORAGE_KEY = 'maxfama_panel_layout_v3';

const DEFAULT_PANELS: PanelConfig[] = [
  {
    id: 'kpis-fichas',
    title: 'KPIs - Fichas e Valores',
    position: { x: 20, y: 120 },
    size: { width: 800, height: 200 },
    isCollapsed: false,
    component: 'kpis-fichas',
    visible: true
  },
  {
    id: 'kpis-ajuda',
    title: 'KPIs - Ajuda de Custo',
    position: { x: 840, y: 120 },
    size: { width: 400, height: 200 },
    isCollapsed: false,
    component: 'kpis-ajuda',
    visible: true
  },
  {
    id: 'charts-scouter',
    title: 'Fichas por Scouter',
    position: { x: 20, y: 340 },
    size: { width: 600, height: 350 },
    isCollapsed: false,
    component: 'chart-scouter',
    visible: true
  },
  {
    id: 'charts-project',
    title: 'Fichas por Projeto',
    position: { x: 640, y: 340 },
    size: { width: 600, height: 350 },
    isCollapsed: false,
    component: 'chart-project',
    visible: true
  },
  {
    id: 'line-chart',
    title: 'Projeção vs Real',
    position: { x: 20, y: 710 },
    size: { width: 820, height: 300 },
    isCollapsed: false,
    component: 'line-chart',
    visible: true
  },
  {
    id: 'funnel-chart',
    title: 'Funil de Status',
    position: { x: 860, y: 340 },
    size: { width: 380, height: 400 },
    isCollapsed: false,
    component: 'funnel-chart',
    visible: true
  },
  {
    id: 'scouter-table',
    title: 'Tabela de Scouters',
    position: { x: 20, y: 1030 },
    size: { width: 1220, height: 400 },
    isCollapsed: false,
    component: 'scouter-table',
    visible: true
  }
];

// Detect overlaps and auto-adjust positions
const avoidOverlaps = (panels: PanelConfig[]): PanelConfig[] => {
  const adjusted = [...panels];
  const gridSize = 20;
  
  for (let i = 0; i < adjusted.length; i++) {
    for (let j = i + 1; j < adjusted.length; j++) {
      const panelA = adjusted[i];
      const panelB = adjusted[j];
      
      if (!panelA.visible || !panelB.visible) continue;
      
      // Check for overlap
      const overlapX = panelA.position.x < panelB.position.x + panelB.size.width &&
                     panelA.position.x + panelA.size.width > panelB.position.x;
      const overlapY = panelA.position.y < panelB.position.y + panelB.size.height &&
                     panelA.position.y + panelA.size.height > panelB.position.y;
      
      if (overlapX && overlapY) {
        // Move panel B to avoid overlap
        const moveRight = panelA.position.x + panelA.size.width + gridSize;
        const moveDown = panelA.position.y + panelA.size.height + gridSize;
        
        // Choose the direction that keeps the panel more in view
        if (moveRight + panelB.size.width <= window.innerWidth - gridSize) {
          adjusted[j].position.x = moveRight;
        } else {
          adjusted[j].position.y = moveDown;
        }
      }
    }
  }
  
  return adjusted;
};

export const usePanelLayout = () => {
  const [panels, setPanels] = useState<PanelConfig[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

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
        setPanels(avoidOverlaps(mergedPanels));
      } catch (error) {
        console.error('Error loading panel layout:', error);
        setPanels(avoidOverlaps(DEFAULT_PANELS));
      }
    } else {
      setPanels(avoidOverlaps(DEFAULT_PANELS));
    }
  }, []);

  // Save layout whenever panels change
  useEffect(() => {
    if (panels.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    }
  }, [panels]);

  const updatePanel = useCallback((id: string, updates: Partial<PanelConfig>) => {
    setPanels(prev => {
      const updated = prev.map(panel => 
        panel.id === id ? { ...panel, ...updates } : panel
      );
      return avoidOverlaps(updated);
    });
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
    setPanels(avoidOverlaps(DEFAULT_PANELS));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const addPanel = useCallback((panelConfig: Omit<PanelConfig, 'id'> & { id?: string }) => {
    const id = panelConfig.id || `panel-${Date.now()}`;
    const newPanel: PanelConfig = {
      ...panelConfig,
      id,
      visible: true
    };
    setPanels(prev => avoidOverlaps([...prev, newPanel]));
  }, []);

  const autoOrganize = useCallback(() => {
    const visiblePanels = panels.filter(p => p.visible);
    const cols = Math.ceil(Math.sqrt(visiblePanels.length));
    const organized = visiblePanels.map((panel, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const margin = 20;
      const defaultWidth = 400;
      const defaultHeight = 300;
      
      return {
        ...panel,
        position: {
          x: margin + col * (defaultWidth + margin),
          y: 120 + row * (defaultHeight + margin)
        },
        size: { width: defaultWidth, height: defaultHeight }
      };
    });
    
    setPanels(prev => prev.map(panel => {
      const organizedPanel = organized.find(p => p.id === panel.id);
      return organizedPanel || panel;
    }));
  }, [panels]);

  const alignPanels = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const visiblePanels = panels.filter(p => p.visible);
    if (visiblePanels.length === 0) return;

    const aligned = visiblePanels.map(panel => {
      let newPosition = { ...panel.position };
      
      switch (alignment) {
        case 'left':
          newPosition.x = 20;
          break;
        case 'center':
          newPosition.x = (window.innerWidth - panel.size.width) / 2;
          break;
        case 'right':
          newPosition.x = window.innerWidth - panel.size.width - 20;
          break;
        case 'top':
          newPosition.y = 120;
          break;
        case 'middle':
          newPosition.y = (window.innerHeight - panel.size.height) / 2;
          break;
        case 'bottom':
          newPosition.y = window.innerHeight - panel.size.height - 20;
          break;
      }
      
      return { ...panel, position: newPosition };
    });
    
    setPanels(prev => prev.map(panel => {
      const alignedPanel = aligned.find(p => p.id === panel.id);
      return alignedPanel || panel;
    }));
  }, [panels]);

  return {
    panels: panels.filter(p => p.visible),
    allPanels: panels,
    isEditMode,
    setIsEditMode,
    movePanel,
    resizePanel,
    togglePanelCollapse,
    togglePanelVisibility,
    removePanel,
    resetLayout,
    addPanel,
    updatePanel,
    autoOrganize,
    alignPanels
  };
};
