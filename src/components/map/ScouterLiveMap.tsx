/**
 * Mapa em tempo real com posições dos scouters
 * Mostra markers coloridos por tier com tooltips
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useScoutersLastLocations } from '@/hooks/useScoutersLastLocations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cores por tier
const TIER_COLORS: Record<string, string> = {
  'Bronze': '#CD7F32',
  'Prata': '#C0C0C0',
  'Ouro': '#FFD700',
  'default': '#3B82F6',
};

// Criar ícone customizado (ícone de pessoa)
function createMarkerIcon(color: string): L.DivIcon {
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

export function ScouterLiveMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { locations, isLoading, error } = useScoutersLastLocations();
  const [activeScouters, setActiveScouters] = useState(0);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11); // São Paulo center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !locations || locations.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

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
  }, [locations]);

  // Center map on all markers
  const handleCenterMap = () => {
    if (!mapRef.current || markersRef.current.length === 0) return;

    const group = L.featureGroup(markersRef.current);
    mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Scouters ao Vivo</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeScouters} ativos (≤10min)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCenterMap}
              disabled={markersRef.current.length === 0}
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
            <p className="text-sm text-destructive">Erro ao carregar localizações</p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
      </CardContent>
    </Card>
  );
}
