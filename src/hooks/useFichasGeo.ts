// @ts-nocheck
/**
 * Hook para buscar dados de geolocalização das fichas (heatmap)
 * Inclui suporte a Realtime updates
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface FichaGeo {
  id: number;
  lat: number;
  lng: number;
  created_at: string;
  projeto: string | null;
  scouter: string | null;
}

interface FichasGeoParams {
  startDate: string;
  endDate: string;
  project?: string | null;
  scouter?: string | null;
}

export function useFichasGeo(params: FichasGeoParams) {
  const { startDate, endDate, project, scouter } = params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fichas-geo', startDate, endDate, project, scouter],
    queryFn: async (): Promise<FichaGeo[]> => {
      const { data, error } = await supabase
        .rpc('get_fichas_geo', {
          p_start: startDate,
          p_end: endDate,
          p_project: project || null,
          p_scouter: scouter || null,
        });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60000, // 1 minute
    enabled: !!startDate && !!endDate,
  });

  // Subscribe to realtime updates on fichas
  useEffect(() => {
    const channel = supabase
      .channel('fichas_geo_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fichas',
          filter: 'lat=not.is.null'
        },
        () => {
          // Refetch when fichas with geo data are inserted/updated
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    fichasGeo: data || [],
    isLoading,
    error,
    refetch,
  };
}
