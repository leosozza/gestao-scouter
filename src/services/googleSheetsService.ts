
/**
 * GoogleSheetsService – correções de sincronização
 * - Força no-cache (Cache-Control/Pragma) e bust de URL (?ts=…)
 * - Exponibiliza fetchFichas({ force }) para ignorar cache local
 * - Remove memoização global que "congela" resultados
 */
type FetchOpts = { force?: boolean };

let _cacheFichas: any[] | null = null;
let _cacheStamp = 0;
const CACHE_TTL_MS = 30_000; // 30s para evitar flood e ainda manter "vivo"

async function fetchJsonNoCache(url: string) {
  const urlNoCache = url.includes("?") ? `${url}&ts=${Date.now()}` : `${url}?ts=${Date.now()}`;
  const res = await fetch(urlNoCache, {
    method: "GET",
    // Forçar no-cache em navegadores/CDNs
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
  if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status} ${res.statusText}`);
  return await res.json();
}

export const GoogleSheetsService = {
  // ajuste para seu endpoint publicado ou Apps Script:
  fichasEndpoint: import.meta.env?.VITE_SHEETS_FICHAS_URL || 'https://your-app-script-url.here',

  async fetchFichas(opts: FetchOpts = {}): Promise<any[]> {
    const now = Date.now();
    const fresh = _cacheFichas && now - _cacheStamp < CACHE_TTL_MS;
    if (!opts.force && fresh) return _cacheFichas!;
    if (!this.fichasEndpoint) throw new Error("NEXT_PUBLIC_SHEETS_FICHAS_URL não configurada.");

    // Lê sem cache e atualiza cache local
    const data = await fetchJsonNoCache(this.fichasEndpoint);
    // Caso seu endpoint não devolva array direto, adapte aqui:
    const rows = Array.isArray(data) ? data : (data?.rows ?? data?.data ?? []);
    _cacheFichas = rows;
    _cacheStamp = now;
    return rows;
  },

  // utilitário para forçar refresh manual
  invalidate() {
    _cacheFichas = null;
    _cacheStamp = 0;
  },

  // Maintain compatibility with existing code - legacy methods
  async fetchProjetos(): Promise<any[]> {
    // For now, return empty array to maintain compatibility
    // In a real implementation, you would have a separate endpoint or parse from the same data
    return [];
  },

  async fetchMetasScouter(): Promise<any[]> {
    // For now, return empty array to maintain compatibility
    return [];
  },

  async updateFichaPagaStatus(fichaIds: string[], status: 'Sim' | 'Não'): Promise<void> {
    console.log(`GoogleSheetsService: Simulando atualização de "Ficha paga" para ${status}:`, fichaIds);
    
    // Aqui seria implementada a atualização real via Google Sheets API
    // Por enquanto, apenas simula o delay de uma operação real
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`GoogleSheetsService: Atualização simulada concluída para ${fichaIds.length} fichas`);
  },

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('GoogleSheetsService: Testando conexão...');
      
      const fichas = await this.fetchFichas();
      const success = fichas.length > 0;
      
      return {
        success,
        message: success 
          ? `Conexão bem-sucedida! ${fichas.length} fichas encontradas.`
          : 'Conexão estabelecida, mas nenhum dado foi encontrado.',
        data: {
          fichas: fichas.length,
          projetos: 0,
          camposDisponiveis: fichas.length > 0 ? Object.keys(fichas[0]) : []
        }
      };
    } catch (error) {
      console.error('GoogleSheetsService: Erro no teste de conexão:', error);
      return {
        success: false,
        message: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
};


