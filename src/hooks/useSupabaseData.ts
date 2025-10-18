import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { detectMissingFields } from '@/utils/fieldValidator';

interface SupabaseDataResult<T> {
  data: T[];
  missingFields: string[];
}

interface UseSupabaseDataOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Hook unificado para buscar dados do Supabase com detecção de campos ausentes
 */
export function useSupabaseData<T = any>(
  options: UseSupabaseDataOptions
): {
  data: T[];
  missingFields: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const {
    table,
    select = '*',
    filters,
    orderBy,
    limit,
    enabled = true,
    staleTime = 30000
  } = options;

  const query = useQuery({
    queryKey: ['supabase-data', table, select, filters, orderBy, limit],
    queryFn: async (): Promise<SupabaseDataResult<T>> => {
      // Use any para evitar problemas de tipo com tabelas dinâmicas
      let queryBuilder = supabase.from(table as any).select(select);

      // Aplicar filtros dinamicamente
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              queryBuilder = queryBuilder.in(key, value);
            } else {
              queryBuilder = queryBuilder.eq(key, value);
            }
          }
        });
      }

      // Ordenação com fallback para fichas (criado vs created_at)
      if (orderBy) {
        if (table === 'fichas' && orderBy.column === 'created_at') {
          // Use criado em vez de created_at para a tabela fichas
          queryBuilder = queryBuilder.order('criado', { ascending: orderBy.ascending ?? false });
        } else {
          queryBuilder = queryBuilder.order(orderBy.column, { ascending: orderBy.ascending ?? false });
        }
      }

      // Limite
      if (limit) {
        queryBuilder = queryBuilder.limit(limit);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`Erro ao buscar dados de ${table}:`, error);
        throw error;
      }

      // Detectar campos ausentes apenas se table for uma das validadas
      let missingFields: string[] = [];
      if (table === 'fichas' || table === 'scouter_profiles') {
        missingFields = detectMissingFields(data || [], table);
      }

      return {
        data: (data || []) as T[],
        missingFields
      };
    },
    enabled,
    staleTime
  });

  return {
    data: query.data?.data || [],
    missingFields: query.data?.missingFields || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch
  };
}
