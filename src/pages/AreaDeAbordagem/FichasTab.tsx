/**
 * FichasTab Component
 * Integrated Fichas visualization with drawing, clustering, and analysis
 * Mobile-optimized with touch-friendly controls
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import * as turf from '@turf/turf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Pencil, RefreshCw, X, Navigation, Flame } from 'lucide-react';
import { useFichasFromSheets } from '@/hooks/useFichasFromSheets';
import { getTileServerConfig, DEFAULT_TILE_SERVER } from '@/config/tileServers';
import type { FichaMapData } from '@/services/googleSheetsMapService';

// Geoman types
interface GeomanMap extends L.Map {
  pm?: {
    setPathOptions: (options: Record<string, unknown>) => void;
    enableDraw: (shape: string, options: Record<string, unknown>) => void;
    disableDraw: () => void;
    globalDrawModeEnabled: () => boolean;
  };
}

interface GeomanCreateEvent {
  layer: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
  };
  shape: string;
}

// Extended ficha type with metadata
interface FichaDataPoint extends FichaMapData {
  id?: string;
  projeto?: string;
  scouter?: string;
  data?: string;
}

interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
}

// Format large numbers with K suffix
function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

export function FichasTab() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const drawnLayerRef = useRef<L.Layer | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [allFichas, setAllFichas] = useState<FichaDataPoint[]>([]);
  const [displayedFichas, setDisplayedFichas] = useState<FichaDataPoint[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Fetch data from Google Sheets
  const { fichas, isLoading, error, refetch, isFetching } = useFichasFromSheets();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11);
    const tileConfig = getTileServerConfig(DEFAULT_TILE_SERVER);
    
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      clusterGroupRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/remove drawing-mode class
  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (!container) return;
    
    if (isDrawing) {
      container.classList.add('drawing-mode');
    } else {
      container.classList.remove('drawing-mode');
    }
  }, [isDrawing]);

  // Update fichas data
  useEffect(() => {
    if (!fichas || fichas.length === 0) {
      setAllFichas([]);
      setDisplayedFichas([]);
      return;
    }

    // Convert to FichaDataPoint with metadata
    // In a real implementation, these would come from additional columns
    const enrichedFichas: FichaDataPoint[] = fichas.map((f, index) => ({
      ...f,
      id: `ficha-${index}`,
      projeto: 'Projeto Padrão', // Would come from sheet
      scouter: 'Scouter Desconhecido', // Would come from sheet
      data: new Date().toISOString(), // Would come from sheet
    }));

    setAllFichas(enrichedFichas);
    setDisplayedFichas(enrichedFichas);
    setSummary(generateAnalysis(enrichedFichas));
  }, [fichas]);

  // Update clusters when data changes
  useEffect(() => {
    if (!mapRef.current || displayedFichas.length === 0) {
      // Clear clusters if no data
      if (clusterGroupRef.current) {
        mapRef.current?.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
      return;
    }

    console.log(`[Fichas] Rendering ${displayedFichas.length} fichas with clustering`);

    // Clear existing clusters
    if (clusterGroupRef.current) {
      mapRef.current.removeLayer(clusterGroupRef.current);
    }

    // Create marker cluster group
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        
        if (count >= 100) {
          size = 'large';
        } else if (count >= 10) {
          size = 'medium';
        }
        
        return L.divIcon({
          html: `<div style="
            background-color: #FF6B35;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            border: 3px solid white;
          ">${formatK(count)}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      }
    });

    // Add markers
    displayedFichas.forEach((ficha) => {
      const marker = L.circleMarker([ficha.lat, ficha.lng], {
        radius: 6,
        fillColor: '#FF6B35',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      });
      
      marker.bindPopup(`
        <div style="font-family: system-ui; padding: 4px;">
          <strong>Ficha</strong><br/>
          <small>Projeto: ${ficha.projeto || 'N/A'}</small><br/>
          <small>Scouter: ${ficha.scouter || 'N/A'}</small><br/>
          <small>${ficha.lat.toFixed(4)}, ${ficha.lng.toFixed(4)}</small>
        </div>
      `);
      
      clusterGroup.addLayer(marker);
    });

    mapRef.current.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Fit bounds
    if (displayedFichas.length > 0) {
      const bounds = L.latLngBounds(displayedFichas.map(f => [f.lat, f.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [displayedFichas]);

  // Geoman event listener for polygon creation
  useEffect(() => {
    const map = mapRef.current as GeomanMap;
    if (!map || !map.pm) return;

    const onCreate = (e: GeomanCreateEvent) => {
      // Remove previous polygon
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }
      drawnLayerRef.current = e.layer;
      setIsDrawing(false);
      map.pm.disableDraw();

      // Get polygon coordinates
      const latlngs = e.layer.getLatLngs()[0];
      const coords = latlngs.map((p) => [p.lng, p.lat]);
      coords.push(coords[0]); // Close polygon

      // Filter fichas inside polygon using Turf.js
      const polygon = turf.polygon([coords]);
      const selected = allFichas.filter((ficha) => {
        const point = turf.point([ficha.lng, ficha.lat]);
        return turf.booleanPointInPolygon(point, polygon);
      });

      console.log(`✅ [Fichas] Polygon created: ${selected.length} fichas selected`);

      setDisplayedFichas(selected);
      setSummary(generateAnalysis(selected));
      setShowSummary(true);
    };

    map.on('pm:create', onCreate);
    return () => {
      map.off('pm:create', onCreate);
    };
  }, [allFichas]);

  // Generate analysis summary
  const generateAnalysis = (fichas: FichaDataPoint[]): AnalysisSummary => {
    const projetoMap = new Map<string, Map<string, number>>();

    fichas.forEach((ficha) => {
      const projeto = ficha.projeto || 'Sem Projeto';
      const scouter = ficha.scouter || 'Não Identificado';

      if (!projetoMap.has(projeto)) {
        projetoMap.set(projeto, new Map());
      }
      
      const scouterMap = projetoMap.get(projeto)!;
      scouterMap.set(scouter, (scouterMap.get(scouter) || 0) + 1);
    });

    const byProjeto: ProjetoSummary[] = [];
    projetoMap.forEach((scouterMap, projeto) => {
      let total = 0;
      scouterMap.forEach((count) => {
        total += count;
      });
      byProjeto.push({ projeto, total, byScout: scouterMap });
    });

    // Sort by total descending
    byProjeto.sort((a, b) => b.total - a.total);

    return {
      total: fichas.length,
      byProjeto,
    };
  };

  // Start drawing
  const handleStartDrawing = () => {
    const map = mapRef.current as GeomanMap;
    if (!map?.pm) {
      console.error('Geoman não carregado (map.pm undefined)');
      return;
    }
    
    setShowSummary(false);
    setIsDrawing(true);
    
    // Disable any existing draw mode
    if (map.pm.globalDrawModeEnabled()) {
      map.pm.disableDraw();
    }
    
    // Set drawing style
    map.pm.setPathOptions({ 
      color: '#4096ff', 
      fillColor: '#4096ff', 
      fillOpacity: 0.1, 
      weight: 2 
    });
    
    // Enable polygon drawing
    map.pm.enableDraw('Polygon', {
      snappable: true,
      snapDistance: 25,
      allowSelfIntersection: false,
      finishOnDoubleClick: true,
      tooltips: true
    });
    
    console.log('✏️ [Fichas] Polygon drawing mode activated');
  };

  // Clear selection
  const handleClearSelection = () => {
    const map = mapRef.current;
    if (drawnLayerRef.current && map) {
      map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }
    setDisplayedFichas(allFichas);
    setSummary(generateAnalysis(allFichas));
    setIsDrawing(false);
    setShowSummary(false);
  };

  // Center map
  const handleCenterMap = () => {
    if (!mapRef.current || displayedFichas.length === 0) return;
    const bounds = L.latLngBounds(displayedFichas.map(f => [f.lat, f.lng]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle>Fichas - Análise de Área</CardTitle>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {displayedFichas.length === allFichas.length 
                ? `${formatK(displayedFichas.length)} fichas total`
                : `${formatK(displayedFichas.length)} de ${formatK(allFichas.length)} selecionadas`
              }
            </span>

            {/* Mobile-optimized buttons (≥44px) */}
            <Button
              variant={isDrawing ? "default" : "outline"}
              size="default"
              onClick={handleStartDrawing}
              disabled={isDrawing || allFichas.length === 0}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title={isDrawing ? "Desenhando... (duplo clique para finalizar)" : "Desenhar área"}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isDrawing ? 'Desenhando...' : 'Desenhar'}
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleClearSelection}
              disabled={displayedFichas.length === allFichas.length}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title="Limpar seleção"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleCenterMap}
              disabled={displayedFichas.length === 0}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title="Centralizar mapa"
            >
              <Navigation className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="min-w-[44px] min-h-[44px] touch-manipulation"
              title="Recarregar dados"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 relative">
        {/* Loading state */}
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <p className="text-sm text-destructive">Erro ao carregar fichas</p>
          </div>
        )}

        {/* Summary panel */}
        {showSummary && summary && (
          <div className="absolute top-4 right-4 z-50 w-[min(90vw,380px)] bg-white/95 rounded-lg shadow-lg border p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Análise da Área</h3>
              <button 
                className="p-1 rounded hover:bg-gray-100 min-w-[44px] min-h-[44px] touch-manipulation flex items-center justify-center"
                onClick={() => setShowSummary(false)}
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="text-base">
                <strong>Total de fichas:</strong> {summary.total}
              </div>
              
              {summary.byProjeto.length > 0 && (
                <div>
                  <div className="font-semibold mb-2">Por Projeto:</div>
                  {summary.byProjeto.map((proj) => (
                    <div key={proj.projeto} className="mb-3 pl-2 border-l-2 border-orange-400">
                      <div className="font-medium">{proj.projeto} — total {proj.total}</div>
                      <div className="pl-3 text-sm text-muted-foreground">
                        {Array.from(proj.byScout.entries()).map(([scouter, count]) => (
                          <div key={scouter}>
                            {scouter}: {count}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map container */}
        <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
      </CardContent>
    </Card>
  );
}
