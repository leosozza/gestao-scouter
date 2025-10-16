import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fichaMapper } from '@/services/fieldMappingService';
import type { FichaDataPoint } from '@/types/ficha';

interface UseFichasParams {
  startDate?: string;
  endDate?: string;
  projeto?: string;
  scouter?: string;
  withGeo?: boolean;
}

export function useFichas(params: UseFichasParams = {}) {
  return useQuery({
    queryKey: ['fichas', params],
    queryFn: async (): Promise<FichaDataPoint[]> => {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('deleted', false);

      if (params.startDate) {
        query = query.gte('criado', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('criado', params.endDate);
      }
      if (params.projeto) {
        query = query.eq('projeto', params.projeto);
      }
      if (params.scouter) {
        query = query.ilike('scouter', `%${params.scouter}%`);
      }
      if (params.withGeo) {
        query = query.not('latitude', 'is', null)
                     .not('longitude', 'is', null);
      }

      const { data, error } = await query.order('criado', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => fichaMapper.normalizeFichaGeo(row));
    },
    staleTime: 30000,
  });
}
