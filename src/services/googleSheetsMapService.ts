// STUB: Este serviço foi depreciado. Use useFichas({ withGeo: true })
export interface FichaMapData {
  lat: number;
  lng: number;
}

export async function fetchFichasData(): Promise<FichaMapData[]> {
  console.warn('fetchFichasData() está depreciado. Use useFichas({ withGeo: true })');
  return [];
}
