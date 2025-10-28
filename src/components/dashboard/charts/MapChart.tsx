
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface LocationData {
  lat: number;
  lon: number;
  fichas: number;
  conversao: number;
  endereco?: string;
}

interface MapChartProps {
  title: string;
  data: LocationData[];
  isLoading?: boolean;
}

export const MapChart = ({ title, data, isLoading }: MapChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Simulação de mapa - em produção seria integrado com Google Maps ou Mapbox
  const getBubbleSize = (fichas: number) => {
    const maxFichas = Math.max(...data.map(d => d.fichas));
    return Math.max(8, (fichas / maxFichas) * 32);
  };

  const getBubbleColor = (conversao: number) => {
    if (conversao >= 80) return "hsl(var(--success))";
    if (conversao >= 60) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-64 bg-muted rounded border overflow-hidden">
          {/* Simulação de mapa */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
            {data.map((location, index) => (
              <div
                key={index}
                className="absolute rounded-full opacity-70 hover:opacity-90 cursor-pointer transition-opacity"
                style={{
                  left: `${20 + (index % 5) * 15}%`,
                  top: `${20 + Math.floor(index / 5) * 20}%`,
                  width: getBubbleSize(location.fichas),
                  height: getBubbleSize(location.fichas),
                  backgroundColor: getBubbleColor(location.conversao),
                }}
                title={`${location.endereco || 'Local'}: ${location.fichas} fichas, ${location.conversao.toFixed(1)}% conversão`}
              />
            ))}
          </div>
          
          {/* Legenda */}
          <div className="absolute bottom-4 left-4 bg-background/90 p-3 rounded-lg border text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span>Alta conversão (≥80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning"></div>
                <span>Média conversão (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive"></div>
                <span>Baixa conversão (&lt;60%)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lista de locais */}
        <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
          {data.map((location, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="truncate">{location.endereco || `Local ${index + 1}`}</span>
              <div className="flex gap-4 text-muted-foreground">
                <span>{location.fichas} fichas</span>
                <span>{location.conversao.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
