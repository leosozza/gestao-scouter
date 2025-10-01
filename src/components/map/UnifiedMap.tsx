/**
 * Unified Map Component
 * Single map with toggle between Scouter view (clusters) and Fichas heatmap view
 * Reads data directly from Google Sheets CSV exports
 * Future-ready: Easy to swap to Supabase data source
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-expect-error - leaflet.heat doesn't have types
import 'leaflet.heat';
// @ts-expect-error - leaflet.markercluster doesn't have complete types
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useScoutersFromSheets } from '@/hooks/useScoutersFromSheets';
import { useFichasFromSheets } from '@/hooks/useFichasFromSheets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MapPin, Users, Navigation, Loader2 } from 'lucide-react';
import { getTileServerConfig, DEFAULT_TILE_SERVER } from '@/config/tileServers';

// Default marker icon color
const DEFAULT_MARKER_COLOR = '#3B82F6';

// Criar ícone customizado para scouters (ícone de pessoa)
function createMarkerIcon(color: string = DEFAULT_MARKER_COLOR): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

type MapViewMode = 'scouters' | 'fichas';

interface UnifiedMapProps {
  startDate?: string;
  endDate?: string;
  project?: string | null;
  scouter?: string | null;
}

export function UnifiedMap({ 
  startDate, 
  endDate, 
  project, 
  scouter 
}: UnifiedMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // @ts-expect-error - MarkerClusterGroup typing
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  
  const [viewMode, setViewMode] = useState<MapViewMode>('scouters');
  const [totalScouters, setTotalScouters] = useState(0);
  const [totalFichas, setTotalFichas] = useState(0);

  // Fetch data from Google Sheets
  const { scouters, isLoading: isLoadingScouters, error: errorScouters } = useScoutersFromSheets();
  const { fichas, isLoading: isLoadingFichas, error: errorFichas } = useFichasFromSheets();

  const isLoading = isLoadingScouters || isLoadingFichas;
  const error = errorScouters || errorFichas;

  // Initialize map with configurable tile server
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11); // São Paulo center

    // Get tile server configuration (from env var or default)
    const tileConfig = getTileServerConfig(DEFAULT_TILE_SERVER);
    
    L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Clear current view layers
  const clearLayers = () => {
    if (!mapRef.current) return;

    // Clear cluster group
    if (clusterGroupRef.current) {
      mapRef.current.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    // Clear heatmap
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
  };

  // Update scouter markers with clustering
  useEffect(() => {
    if (!mapRef.current || viewMode !== 'scouters' || !scouters || scouters.length === 0) {
      if (viewMode !== 'scouters') {
        clearLayers();
      }
      return;
    }

    // Clear existing layers
    clearLayers();

    // Create marker cluster group
    // @ts-expect-error - MarkerClusterGroup typing
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster: any) {
        const count = cluster.getChildCount();
        let size = 'small';
        
        if (count >= 10) {
          size = 'large';
        } else if (count >= 5) {
          size = 'medium';
        }
        
        return L.divIcon({
          html: `<div style="
            background-color: #FFD700;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            border: 3px solid white;
          ">${count}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      }
    });

    // Add markers to cluster group
    scouters.forEach(scouter => {
      const icon = createMarkerIcon();
      
      const marker = L.marker([scouter.lat, scouter.lng], { icon });
      
      // Popup with scouter name
      const popupContent = `
        <div style="font-family: system-ui; padding: 4px;">
          <strong>${scouter.nome}</strong>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      clusterGroup.addLayer(marker);
    });

    mapRef.current.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
    setTotalScouters(scouters.length);

    // Fit bounds to show all markers
    if (scouters.length > 0) {
      const bounds = L.latLngBounds(scouters.map(s => [s.lat, s.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [scouters, viewMode]);

  // Update heatmap
  useEffect(() => {
    if (!mapRef.current || viewMode !== 'fichas' || !fichas) {
      if (viewMode !== 'fichas') {
        clearLayers();
      }
      return;
    }

    // Clear existing layers
    clearLayers();

    if (fichas.length === 0) {
      setTotalFichas(0);
      return;
    }

    // Create heat layer points
    const points = fichas.map(ficha => [ficha.lat, ficha.lng, 1]); // [lat, lng, intensity]

    // @ts-expect-error - leaflet.heat typing issue
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.2: '#6BE675', // verde
        0.4: '#FFE58F', // amarelo claro
        0.6: '#FFC53D', // amarelo
        0.8: '#FA8C16', // laranja
        1.0: '#F5222D'  // vermelho
      }
    }).addTo(mapRef.current);

    heatLayerRef.current = heatLayer;
    setTotalFichas(fichas.length);

    // Fit bounds to show all points
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fichas, viewMode]);

  // Center map on current view
  const handleCenterMap = () => {
    if (!mapRef.current) return;

    if (viewMode === 'scouters' && scouters && scouters.length > 0) {
      const bounds = L.latLngBounds(scouters.map(s => [s.lat, s.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else if (viewMode === 'fichas' && fichas && fichas.length > 0) {
      const points = fichas.map(ficha => [ficha.lat, ficha.lng]);
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Mapa Unificado</CardTitle>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as MapViewMode)}
              className="border rounded-lg"
            >
              <ToggleGroupItem value="scouters" aria-label="Visualizar scouters" className="gap-2">
                <Users className="h-4 w-4" />
                Scouters
              </ToggleGroupItem>
              <ToggleGroupItem value="fichas" aria-label="Visualizar fichas" className="gap-2">
                <MapPin className="h-4 w-4" />
                Fichas
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Stats */}
            <span className="text-sm text-muted-foreground">
              {viewMode === 'scouters' && `${totalScouters} scouters`}
              {viewMode === 'fichas' && `${totalFichas} pontos`}
            </span>

            {/* Center Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCenterMap}
              disabled={
                (viewMode === 'scouters' && totalScouters === 0) ||
                (viewMode === 'fichas' && totalFichas === 0)
              }
            >
              <Navigation className="h-4 w-4 mr-1" />
              Centralizar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <p className="text-sm text-destructive">Erro ao carregar dados do mapa</p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
      </CardContent>
    </Card>
  );
}
