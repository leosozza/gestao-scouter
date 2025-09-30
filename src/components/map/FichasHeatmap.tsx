/**
 * Mapa de calor (heatmap) das fichas por período
 * Mostra densidade de fichas geradas por localização
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore - leaflet.heat doesn't have types
import 'leaflet.heat';
import { useFichasGeo } from '@/hooks/useFichasGeo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Navigation, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface FichasHeatmapProps {
  startDate?: string;
  endDate?: string;
  project?: string | null;
  scouter?: string | null;
}

export function FichasHeatmap({ 
  startDate, 
  endDate, 
  project, 
  scouter 
}: FichasHeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<any>(null);

  // Default to last 30 days if not provided
  const defaultEndDate = format(new Date(), 'yyyy-MM-dd');
  const defaultStartDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const { fichasGeo, isLoading, error } = useFichasGeo({
    startDate: startDate || defaultStartDate,
    endDate: endDate || defaultEndDate,
    project,
    scouter,
  });

  const [totalPoints, setTotalPoints] = useState(0);

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

  // Update heatmap when data changes
  useEffect(() => {
    if (!mapRef.current || !fichasGeo) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (fichasGeo.length === 0) {
      setTotalPoints(0);
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
        0.0: 'green',
        0.5: 'yellow',
        1.0: 'red'
      }
    }).addTo(mapRef.current);

    heatLayerRef.current = heatLayer;
    setTotalPoints(fichasGeo.length);

    // Fit bounds to show all points
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fichasGeo]);

  // Center map on heatmap
  const handleCenterMap = () => {
    if (!mapRef.current || !fichasGeo || fichasGeo.length === 0) return;

    const points = fichasGeo.map(ficha => [ficha.lat, ficha.lng]);
    const bounds = L.latLngBounds(points);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            <CardTitle>Mapa de Calor - Fichas</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {totalPoints} pontos
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCenterMap}
              disabled={totalPoints === 0}
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
            <p className="text-sm text-destructive">Erro ao carregar dados do heatmap</p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
      </CardContent>
    </Card>
  );
}
