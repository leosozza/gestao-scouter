/**
 * Página de Área de Abordagem
 * Mostra dois mapas: Scouters com clustering e Heatmap de fichas
 */
import { useState, useEffect } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoutersClusterMap } from '@/components/map/ScoutersClusterMap';
import { FichasHeatmap } from '@/components/map/FichasHeatmap';
import { MapPin, Flame, RefreshCw, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { useScoutersLastLocations } from '@/hooks/useScoutersLastLocations';
import { useFichasGeo } from '@/hooks/useFichasGeo';
import { supabase } from '@/integrations/supabase/client';

export default function AreaDeAbordagem() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Filter states
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedScouter, setSelectedScouter] = useState<string | null>(null);
  
  // Available filter options
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [availableScouters, setAvailableScouters] = useState<string[]>([]);

  // Fetch data for stats
  const { locations } = useScoutersLastLocations();
  const { fichasGeo } = useFichasGeo({
    startDate,
    endDate,
    project: selectedProject,
    scouter: selectedScouter,
  });

  // Count active scouters (within 10 minutes)
  const activeScouters = locations?.filter(loc => {
    const minutesAgo = Math.floor((new Date().getTime() - new Date(loc.at).getTime()) / 60000);
    return minutesAgo <= 10;
  }).length || 0;

  // Load available filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        // Get unique projects
        const { data: projectsData } = await supabase
          .from('fichas')
          .select('projeto')
          .not('projeto', 'is', null);
        
        if (projectsData) {
          const projects = Array.from(new Set(projectsData.map(f => f.projeto).filter(Boolean))) as string[];
          setAvailableProjects(projects.sort());
        }

        // Get unique scouters
        const { data: scoutersData } = await supabase
          .from('scouters')
          .select('name')
          .order('name');
        
        if (scoutersData) {
          setAvailableScouters(scoutersData.map(s => s.name));
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };

    loadFilters();
  }, []);

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
        <div className="flex items-center justify-between flex-wrap gap-4">
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Period */}
              <div className="space-y-2">
                <Label htmlFor="start-date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data Início
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Data Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select
                  value={selectedProject || 'all'}
                  onValueChange={(value) => setSelectedProject(value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os projetos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    {availableProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scouter Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Scouter
                </Label>
                <Select
                  value={selectedScouter || 'all'}
                  onValueChange={(value) => setSelectedScouter(value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os scouters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os scouters</SelectItem>
                    {availableScouters.map((scouter) => (
                      <SelectItem key={scouter} value={scouter}>
                        {scouter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scouters Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeScouters}</div>
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
              <div className="text-2xl font-bold">{fichasGeo?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Maps Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map 1: Scouters with Clustering */}
          <div className="h-[600px]">
            <ScoutersClusterMap scouter={selectedScouter} />
          </div>

          {/* Map 2: Fichas Heatmap */}
          <div className="h-[600px]">
            <FichasHeatmap 
              startDate={startDate}
              endDate={endDate}
              project={selectedProject}
              scouter={selectedScouter}
            />
          </div>
        </div>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sobre os Mapas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Mapa de Scouters (Esquerda):</strong> Mostra a posição em tempo real dos scouters com clusters amarelos. 
              Ao aproximar, os clusters se separam em markers individuais com o nome do scouter visível. 
              As cores representam os tiers: Bronze (marrom), Prata (cinza), Ouro (dourado).
            </p>
            <p>
              <strong>Mapa de Calor (Direita):</strong> Visualiza a densidade de fichas geradas por localização. 
              Quanto mais vermelho, maior a concentração de fichas naquela área. Verde indica baixa concentração.
            </p>
            <p>
              <strong>Filtros:</strong> Use os filtros acima para refinar a visualização por período, projeto ou scouter específico.
              Os filtros afetam ambos os mapas simultaneamente.
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
