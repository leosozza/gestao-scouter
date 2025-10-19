/**
 * Exemplo Completo de Integração do Módulo Leads
 * Demonstra uso de todas as funcionalidades:
 * - Heatmap persistente
 * - Seleção espacial (retângulo/polígono)
 * - Resumo estatístico
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  loadLeadsData,
  createLeadsHeatmap,
  createLeadsSelection,
  generateSummary,
  formatSummaryText,
  type LeadDataPoint,
  type LeadsSummaryData,
  type SelectionResult,
  type LeadsHeatmap,
  type LeadsSelection,
} from '@/map/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Square, Pencil, X, Navigation, Loader2, RefreshCw } from 'lucide-react';
import { getTileServerConfig, DEFAULT_TILE_SERVER } from '@/config/tileServers';

export function LeadsModuleExample() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<LeadsHeatmap | null>(null);
  const selectionRef = useRef<LeadsSelection | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allLeads, setAllFichas] = useState<LeadDataPoint[]>([]);
  const [displayedLeads, setDisplayedFichas] = useState<LeadDataPoint[]>([]);
  const [summary, setSummary] = useState<LeadsSummaryData | null>(null);
  const [selectionMode, setSelectionMode] = useState<'none' | 'rectangle' | 'polygon'>('none');

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    console.log('🗺️ [Example] Initializing map...');
    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11);

    // Add tile layer
    const tileConfig = getTileServerConfig(DEFAULT_TILE_SERVER);
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      console.log('🧹 [Example] Cleaning up map...');
      heatmapRef.current?.destroy();
      selectionRef.current?.destroy();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Load leads data
  useEffect(() => {
    if (!mapRef.current) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('📥 [Example] Loading leads data...');
        const { leads } = await loadLeadsData();
        
        console.log(`✅ [Example] Loaded ${fichas.length} leads`);
        setAllFichas(fichas);
        setDisplayedFichas(fichas);
        
        // Create heatmap
        if (mapRef.current) {
          console.log('🔥 [Example] Creating heatmap...');
          const heatmap = createLeadsHeatmap(mapRef.current);
          heatmap.updateData(fichas);
          heatmap.fitBounds();
          heatmapRef.current = heatmap;
          
          // Generate initial summary
          const initialSummary = generateSummary(fichas);
          setSummary(initialSummary);
          console.log('📊 [Example] Initial summary:', formatSummaryText(initialSummary));
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Example] Error loading data:', err);
        setError('Erro ao carregar dados das leads');
        setIsLoading(false);
      }
    };

    loadData();
  }, [mapRef.current]);

  // Handle selection complete
  const handleSelectionComplete = (result: SelectionResult) => {
    console.log(`✅ [Example] Selection complete: ${result.fichas.length} leads selected`);
    
    // Update displayed leads
    setDisplayedFichas(result.fichas);
    
    // Update heatmap
    if (heatmapRef.current) {
      heatmapRef.current.updateData(result.fichas);
    }
    
    // Update summary
    const newSummary = generateSummary(result.fichas);
    setSummary(newSummary);
    console.log('📊 [Example] Selection summary:', formatSummaryText(newSummary));
    
    // Reset selection mode
    setSelectionMode('none');
  };

  // Start rectangle selection
  const startRectangleSelection = () => {
    if (!mapRef.current || allLeads.length === 0) return;
    
    console.log('📐 [Example] Starting rectangle selection...');
    
    // Create or recreate selection instance
    if (selectionRef.current) {
      selectionRef.current.destroy();
    }
    
    const selection = createLeadsSelection(
      mapRef.current,
      allLeads,
      handleSelectionComplete
    );
    selectionRef.current = selection;
    
    selection.startRectangleSelection();
    setSelectionMode('rectangle');
  };

  // Start polygon selection
  const startPolygonSelection = () => {
    if (!mapRef.current || allLeads.length === 0) return;
    
    console.log('📐 [Example] Starting polygon selection...');
    
    // Create or recreate selection instance
    if (selectionRef.current) {
      selectionRef.current.destroy();
    }
    
    const selection = createLeadsSelection(
      mapRef.current,
      allLeads,
      handleSelectionComplete
    );
    selectionRef.current = selection;
    
    selection.startPolygonSelection();
    setSelectionMode('polygon');
  };

  // Cancel selection
  const cancelSelection = () => {
    console.log('❌ [Example] Cancelling selection...');
    
    if (selectionRef.current) {
      selectionRef.current.cancelSelection();
      selectionRef.current.destroy();
      selectionRef.current = null;
    }
    
    setSelectionMode('none');
  };

  // Clear selection and show all leads
  const clearSelection = () => {
    console.log('🧹 [Example] Clearing selection...');
    
    if (selectionRef.current) {
      selectionRef.current.clearSelection();
    }
    
    // Reset to show all leads
    setDisplayedFichas(allLeads);
    
    // Update heatmap
    if (heatmapRef.current) {
      heatmapRef.current.updateData(allLeads);
      heatmapRef.current.fitBounds();
    }
    
    // Update summary
    const fullSummary = generateSummary(allLeads);
    setSummary(fullSummary);
    
    setSelectionMode('none');
  };

  // Center map on data
  const centerMap = () => {
    if (heatmapRef.current && displayedLeads.length > 0) {
      heatmapRef.current.fitBounds();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle>Módulo Leads - Exemplo Completo</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode !== 'none' && (
              <span className="text-sm text-orange-600 font-medium">
                {selectionMode === 'rectangle' ? '📐 Desenhando retângulo...' : '✏️ Desenhando polígono...'}
                {selectionMode === 'polygon' && ' (duplo clique para finalizar)'}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex gap-4 p-4">
        {/* Map Container */}
        <div className="flex-1 relative rounded-lg overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm text-muted-foreground">Carregando leads...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button onClick={() => window.location.reload()} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar
                </Button>
              </div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
        </div>

        {/* Controls and Summary Panel */}
        <div className="w-80 flex flex-col gap-4">
          {/* Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Controles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Seleção Espacial:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectionMode === 'rectangle' ? 'default' : 'outline'}
                    size="sm"
                    onClick={startRectangleSelection}
                    disabled={isLoading || selectionMode !== 'none'}
                    className="w-full"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Retângulo
                  </Button>
                  <Button
                    variant={selectionMode === 'polygon' ? 'default' : 'outline'}
                    size="sm"
                    onClick={startPolygonSelection}
                    disabled={isLoading || selectionMode !== 'none'}
                    className="w-full"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Polígono
                  </Button>
                </div>
              </div>
              
              {selectionMode !== 'none' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cancelSelection}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar Seleção
                </Button>
              )}
              
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={isLoading || displayedLeads.length === allLeads.length}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Limpar Seleção
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={centerMap}
                  disabled={isLoading || displayedLeads.length === 0}
                  className="w-full"
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Centralizar Mapa
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Panel */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Resumo {displayedLeads.length !== allLeads.length && '(Selecionadas)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="space-y-4">
                  <div className="text-lg font-semibold">
                    📊 Total: {summary.total} leads
                  </div>
                  
                  {summary.byProjeto.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">🎯 Por Projeto:</div>
                      <div className="space-y-1 ml-4">
                        {summary.byProjeto.map(p => (
                          <div key={p.projeto} className="flex justify-between text-sm">
                            <span>{p.projeto}:</span>
                            <span className="font-medium">
                              {p.count} ({p.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {summary.byScouter.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">👤 Por Scouter:</div>
                      <div className="space-y-1 ml-4">
                        {summary.byScouter.map(s => (
                          <div key={s.scouter} className="flex justify-between text-sm">
                            <span>{s.scouter}:</span>
                            <span className="font-medium">
                              {s.count} ({s.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Carregando resumo...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
