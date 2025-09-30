/**
 * Página de Área de Abordagem
 * Mostra mapa em tempo real de scouters e heatmap de fichas
 */
import { useState } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScouterLiveMap } from '@/components/map/ScouterLiveMap';
import { FichasHeatmap } from '@/components/map/FichasHeatmap';
import { MapPin, Flame, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';

export default function AreaDeAbordagem() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Default period: last 30 days
  const [startDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleEnrichGeo = async () => {
    setIsEnriching(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fichas-geo-enrich?limit=50`,
        {
          method: 'POST',
          headers: {
            'X-Secret': import.meta.env.VITE_SHEETS_SYNC_SHARED_SECRET || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao enriquecer geolocalização');
      }

      const result = await response.json();
      
      toast({
        title: 'Geolocalização Atualizada',
        description: `${result.processed} fichas processadas, ${result.geocoded} geocodificadas`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enriquecer a geolocalização',
        variant: 'destructive',
      });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Área de Abordagem</h1>
            <p className="text-muted-foreground mt-1">
              Visualize scouters em tempo real e mapa de calor das fichas
            </p>
          </div>
          <Button 
            onClick={handleEnrichGeo}
            disabled={isEnriching}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isEnriching ? 'animate-spin' : ''}`} />
            Enriquecer Geolocalização
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scouters Ativos
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Última atualização ≤10 minutos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pontos de Fichas
              </CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Maps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
          {/* Scouters Live Map */}
          <ScouterLiveMap />

          {/* Fichas Heatmap */}
          <FichasHeatmap 
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sobre os Mapas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Mapa de Scouters:</strong> Mostra a posição em tempo real dos scouters com base nos dados do Grid 1351167110. 
              As cores representam os tiers: Bronze (marrom), Prata (cinza), Ouro (dourado).
            </p>
            <p>
              <strong>Mapa de Calor:</strong> Visualiza a densidade de fichas geradas por localização. 
              Quanto mais vermelho, maior a concentração de fichas naquela área.
            </p>
            <p>
              <strong>Enriquecer Geolocalização:</strong> Processa fichas que possuem endereço na coluna "Localização" 
              e converte para coordenadas usando geocodificação (com cache para otimização).
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
