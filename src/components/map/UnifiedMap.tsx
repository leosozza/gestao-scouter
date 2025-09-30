/**
 * Unified Map Component
 * Single map with toggle between Scouter view and Fichas heatmap view
 * Uses OpenStreetMap Shortbread layer
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore - leaflet.heat doesn't have types
import 'leaflet.heat';
import { useScoutersLastLocations } from '@/hooks/useScoutersLastLocations';
import { useFichasGeo } from '@/hooks/useFichasGeo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MapPin, Users, Navigation, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { format, subDays } from 'date-fns';

// Cores por tier
const TIER_COLORS: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Prata': '#C0C0C0',
  'Ouro': '#FFD700',
  'default': '#3B82F6',
};

// Criar ícone customizado para scouters
function createMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
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
  const markersRef = useRef<L.Marker[]>([]);
  const heatLayerRef = useRef<any>(null);
  
  const [viewMode, setViewMode] = useState<MapViewMode>('fichas');
  const [activeScouters, setActiveScouters] = useState(0);
  const [totalFichas, setTotalFichas] = useState(0);

  // Default to last 30 days if not provided
  const defaultEndDate = format(new Date(), 'yyyy-MM-dd');
  const defaultStartDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  // Fetch data for both views
  const { locations, isLoading: isLoadingScouters, error: errorScouters } = useScoutersLastLocations();
  const { fichasGeo, isLoading: isLoadingFichas, error: errorFichas } = useFichasGeo({
    startDate: startDate || defaultStartDate,
    endDate: endDate || defaultEndDate,
    project,
    scouter,
  });

  const isLoading = isLoadingScouters || isLoadingFichas;
  const error = errorScouters || errorFichas;

  // Initialize map with OpenStreetMap Shortbread layer
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11); // São Paulo center

    // Use OpenStreetMap with Shortbread layer
    // Shortbread is a specialized vector tile schema for OpenStreetMap
    // For now using standard OSM tiles as Shortbread requires special tile server setup
    // TODO: Configure Shortbread tile server when available
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Shortbread Schema',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Clear current view when switching modes
  const clearView = () => {
    if (!mapRef.current) return;

    // Clear markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clear heatmap
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
  };

  // Update scouter markers
  useEffect(() => {
    if (!mapRef.current || viewMode !== 'scouters' || !locations || locations.length === 0) {
      if (viewMode !== 'scouters') {
        // Clear markers when not in scouter mode
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
      }
      return;
    }

    // Clear existing markers
    clearView();

    // Count active scouters (last update within 10 minutes)
    const now = new Date();
    let activeCount = 0;

    // Add new markers
    locations.forEach(location => {
      const tierColor = TIER_COLORS[location.tier || 'default'] || TIER_COLORS.default;
      const icon = createMarkerIcon(tierColor);
      
      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(mapRef.current!);

      const lastUpdate = new Date(location.at);
      const minutesAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
      
      if (minutesAgo <= 10) {
        activeCount++;
      }

      const popupContent = `
        <div style="font-family: system-ui; padding: 4px;">
          <strong>${location.scouter}</strong><br/>
          Tier: ${location.tier || 'N/A'}<br/>
          <small>Última atualização: ${formatDistanceToNow(lastUpdate, { locale: ptBR, addSuffix: true })}</small>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    setActiveScouters(activeCount);

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [locations, viewMode]);

  // Update heatmap
  useEffect(() => {
    if (!mapRef.current || viewMode !== 'fichas' || !fichasGeo) {
      if (viewMode !== 'fichas' && heatLayerRef.current) {
        // Clear heatmap when not in fichas mode
        mapRef.current?.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    // Clear existing heatmap
    clearView();

    if (fichasGeo.length === 0) {
      setTotalFichas(0);
      return;
    }

    // Create heat layer points
    const points = fichasGeo.map(ficha => [ficha.lat, ficha.lng, 1]); // [lat, lng, intensity]

    // @ts-ignore - leaflet.heat typing issue
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    }).addTo(mapRef.current);

    heatLayerRef.current = heatLayer;
    setTotalFichas(fichasGeo.length);

    // Fit bounds to show all points
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fichasGeo, viewMode]);

  // Center map on current view
  const handleCenterMap = () => {
    if (!mapRef.current) return;

    if (viewMode === 'scouters' && markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else if (viewMode === 'fichas' && fichasGeo && fichasGeo.length > 0) {
      const points = fichasGeo.map(ficha => [ficha.lat, ficha.lng]);
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
              <ToggleGroupItem value="fichas" aria-label="Visualizar fichas" className="gap-2">
                <MapPin className="h-4 w-4" />
                Fichas
              </ToggleGroupItem>
              <ToggleGroupItem value="scouters" aria-label="Visualizar scouters" className="gap-2">
                <Users className="h-4 w-4" />
                Scouters
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Stats */}
            <span className="text-sm text-muted-foreground">
              {viewMode === 'scouters' && `${activeScouters} ativos (≤10min)`}
              {viewMode === 'fichas' && `${totalFichas} pontos`}
            </span>

            {/* Center Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCenterMap}
              disabled={
                (viewMode === 'scouters' && markersRef.current.length === 0) ||
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
