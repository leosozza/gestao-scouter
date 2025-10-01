/**
 * Hook to fetch fichas data from Google Sheets
 * Returns ficha locations for heatmap visualization
 */
import { useQuery } from '@tanstack/react-query';
import { fetchFichasData, FichaMapData } from '@/services/googleSheetsMapService';

export function useFichasFromSheets() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['fichas-from-sheets'],
    queryFn: async (): Promise<FichaMapData[]> => {
      try {
        return await fetchFichasData();
      } catch (error) {
        console.error('useFichasFromSheets: Error fetching data', error);
        // Return empty array on error to prevent app crash
        return [];
      }
    },
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  return {
    fichas: data || [],
    isLoading,
    error,
    refetch,
    isFetching,
  };
}
