// STUB: Este hook foi depreciado. Use useScouters() do Supabase
import { useScouters } from './useScouters';

export function useScoutersFromSheets() {
  console.warn('useScoutersFromSheets está depreciado. Use useScouters()');
  return useScouters();
}
