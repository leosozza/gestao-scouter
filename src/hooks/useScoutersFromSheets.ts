/**
 * Hook to fetch scouters data from Google Sheets
 * Returns scouter locations with names for map markers
 */
import { useQuery } from '@tanstack/react-query';
import { fetchScoutersData, ScouterMapData } from '@/services/googleSheetsMapService';

export function useScoutersFromSheets() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scouters-from-sheets'],
    queryFn: async (): Promise<ScouterMapData[]> => {
      try {
        return await fetchScoutersData();
      } catch (error) {
        console.error('useScoutersFromSheets: Error fetching data', error);
        // Return empty array on error to prevent app crash
        return [];
      }
    },
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  return {
    scouters: data || [],
    isLoading,
    error,
    refetch,
  };
}
