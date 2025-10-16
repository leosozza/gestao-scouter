// STUB: Este hook foi depreciado. Use useFichas() do Supabase
import { useFichas } from './useFichas';

export function useFichasFromSheets() {
  console.warn('useFichasFromSheets está depreciado. Use useFichas()');
  return useFichas();
}
