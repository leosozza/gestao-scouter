import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-helper';
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
    queryKey: ['leads', params],
    queryFn: async (): Promise<FichaDataPoint[]> => {
      // ⚠️ IMPORTANTE: Sempre usar a tabela 'leads' como fonte única de verdade
      // A tabela 'fichas' foi deprecated - todas as leads são centralizadas em 'leads'
      let query = supabase
        .from('leads')
        .select('*')
        .or('deleted.is.false,deleted.is.null');

      // Apply date filters usando apenas 'criado' (coluna que existe)
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

      // Execute query - ordenar apenas por 'criado'
      const { data, error } = await query.order('criado', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => fichaMapper.normalizeFichaGeo(row));
    },
    staleTime: 30000,
  });
}
