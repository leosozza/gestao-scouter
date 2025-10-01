/**
 * Página de Área de Abordagem
 * Mostra mapa único com toggle: Scouters (clustering) ou Fichas (heatmap)
 * Dados lidos diretamente do Google Sheets
 */
import { useState, useEffect } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UnifiedMap } from '@/components/map/UnifiedMap';
import { MapPin, Flame, RefreshCw, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { useScoutersFromSheets } from '@/hooks/useScoutersFromSheets';
import { useFichasFromSheets } from '@/hooks/useFichasFromSheets';

export default function AreaDeAbordagem() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Filter states (kept for future use, currently not filtering)
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch data from Google Sheets
  const { scouters, refetch: refetchScouters } = useScoutersFromSheets();
  const { fichas, refetch: refetchFichas } = useFichasFromSheets();

  // Stats
  const totalScouters = scouters?.length || 0;
  const totalFichas = fichas?.length || 0;

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
      
      // Refresh data after enrichment
      refetchScouters();
      refetchFichas();
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Área de Abordagem</h1>
            <p className="text-muted-foreground mt-1">
              Visualize scouters e fichas em mapa único com toggle
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
                Total Scouters
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScouters}</div>
              <p className="text-xs text-muted-foreground">
                Com coordenadas válidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Fichas
              </CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFichas}</div>
              <p className="text-xs text-muted-foreground">
                Com localização mapeada
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unified Map with Toggle */}
        <div className="h-[700px]">
          <UnifiedMap 
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sobre o Mapa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Modo Scouters:</strong> Mostra scouters com clustering (círculos amarelos com números). 
              Ao aproximar (zoom in), os clusters se separam em markers individuais. 
              Clique em um marker para ver o nome do scouter.
            </p>
            <p>
              <strong>Modo Fichas:</strong> Visualiza mapa de calor (heatmap) das fichas. 
              Verde → Amarelo → Laranja → Vermelho indica densidade crescente de fichas.
            </p>
            <p>
              <strong>Fonte de Dados:</strong> Lê direto do Google Sheets (GIDs 1351167110 e 452792639). 
              Futuro: fácil migração para Supabase.
            </p>
            <p>
              <strong>Enriquecer Geolocalização:</strong> Processa fichas que possuem endereço 
              e converte para coordenadas usando geocodificação.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
