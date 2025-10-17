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
    queryKey: ['fichas', params],
    queryFn: async (): Promise<FichaDataPoint[]> => {
      // ⚠️ IMPORTANTE: Sempre usar a tabela 'fichas' como fonte única de verdade
      // Nunca use 'leads' ou 'bitrix_leads' - todas as fichas são centralizadas em 'fichas'
      let query = supabase
        .from('fichas')
        .select('*')
        .or('deleted.is.false,deleted.is.null');

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

      // Execute query with ordering fallback
      let data, error;
      try {
        // First attempt: order by 'criado' (most common case)
        const result = await query.order('criado', { ascending: false });
        data = result.data;
        error = result.error;
        
        // If error indicates column doesn't exist, try created_at
        if (error && error.message?.includes('criado')) {
          console.warn('Column "criado" not found, falling back to "created_at"');
          const fallbackResult = await query.order('created_at', { ascending: false });
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      } catch (e) {
        console.warn('Error ordering by "criado", trying "created_at":', e);
        try {
          const result = await query.order('created_at', { ascending: false });
          data = result.data;
          error = result.error;
        } catch (fallbackError) {
          console.error('Both ordering attempts failed:', fallbackError);
          throw fallbackError;
        }
      }

      if (error) throw error;
      
      return (data || []).map(row => fichaMapper.normalizeFichaGeo(row));
    },
    staleTime: 30000,
  });
}
