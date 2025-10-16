// STUB: Este serviço foi depreciado. Use hooks useFichas() e useScouters()
export class GoogleSheetsService {
  static async fetchFichas() {
    console.warn('GoogleSheetsService.fetchFichas() está depreciado. Use useFichas() hook.');
    return [];
  }
  
  static async fetchProjetos() {
    console.warn('GoogleSheetsService.fetchProjetos() está depreciado.');
    return [];
  }
  
  static async fetchMetasScouter() {
    console.warn('GoogleSheetsService.fetchMetasScouter() está depreciado.');
    return [];
  }
  
  static async updateFichaPagaStatus(fichaIds: string[], status: string) {
    console.warn('GoogleSheetsService.updateFichaPagaStatus() está depreciado.');
    return { success: false, message: 'Serviço depreciado' };
  }
  
  static async testConnection() {
    return { success: false, message: 'Serviço depreciado' };
  }
}
