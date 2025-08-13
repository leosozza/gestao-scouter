
// Serviço para buscar dados das planilhas públicas do Google Sheets
export class GoogleSheetsService {
  private static readonly SPREADSHEET_ID = '14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o';
  
  // GIDs das abas
  private static readonly GIDS = {
    fichas: '452792639',
    projetos: '449483735',
    metas_scouter: '0' // A definir quando a aba for criada
  };

  private static csvToJson(csvText: string): any[] {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim().replace(/"/g, '') || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private static async fetchSheetData(gid: string): Promise<any[]> {
    const url = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      return this.csvToJson(csvText);
    } catch (error) {
      console.error(`Erro ao buscar dados da planilha (GID: ${gid}):`, error);
      throw error;
    }
  }

  // Normaliza valores yes/no para boolean
  private static normalizeYesNo(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    return normalized === 'sim' || normalized === 'yes' || normalized === 'true' || normalized === '1';
  }

  // Parse de coordenadas lat,lon
  private static parseLatLon(value: string): { lat: number; lon: number } | null {
    if (!value || !value.includes(',')) return null;
    
    const parts = value.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lon: parts[1] };
    }
    return null;
  }

  // Parse de moeda brasileira
  private static parseMoneyBR(value: string): number {
    if (!value) return 0;
    
    // Remove caracteres não numéricos exceto vírgula e ponto
    const cleaned = value.replace(/[^\d,.]/g, '');
    
    // Se tem vírgula, assume que é separador decimal brasileiro
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      if (parts.length === 2) {
        return parseFloat(parts[0].replace(/\./g, '') + '.' + parts[1]) || 0;
      }
    }
    
    return parseFloat(cleaned.replace(/,/g, '.')) || 0;
  }

  static async fetchFichas(): Promise<any[]> {
    const data = await this.fetchSheetData(this.GIDS.fichas);
    
    // Normalizar dados das fichas
    return data.map(row => ({
      ID: parseInt(row.ID) || 0,
      Projetos_Comerciais: row['Projetos_Comerciais'] || row['Projetos_Cormeciais'] || '', // Tratar typo
      Gestao_de_Scouter: row['Gestao_de_Scouter'] || '',
      Criado: row.Criado || '',
      Data_de_Criacao_da_Ficha: row['Data_de_Criacao_da_Ficha'] || '',
      MaxScouterApp_Verificacao: row['MaxScouterApp_Verificacao'] || '',
      Valor_por_Fichas: row['Valor_por_Fichas'] || 'R$ 0,00',
      Campo_Local: row['Campo_Local'] || '',
      Tem_Foto: row['Tem_Foto'] || '',
      Status_Confirmacao: row['Status_Confirmacao'] || 'Aguardando',
      
      // Campos processados
      valor_por_ficha_num: this.parseMoneyBR(row['Valor_por_Fichas'] || ''),
      geo: this.parseLatLon(row['Campo_Local'] || ''),
      tem_foto: this.normalizeYesNo(row['Tem_Foto'] || ''),
      status_normalizado: (row['Status_Confirmacao'] || 'Aguardando').trim()
    })).filter(row => row.ID > 0 && row.Gestao_de_Scouter && row.Data_de_Criacao_da_Ficha);
  }

  static async fetchProjetos(): Promise<any[]> {
    const data = await this.fetchSheetData(this.GIDS.projetos);
    
    // Normalizar dados dos projetos
    return data.map(row => ({
      Agencia_e_Seletiva: row['Agencia_e_Seletiva'] || '',
      Meta_de_Fichas: parseInt(row['Meta_de_Fichas']) || 0,
      Inicio_Captacao_Fichas: row['Inicio_Captacao_Fichas'] || '',
      Termino_Captacao_Fichas: row['Termino_Captacao_Fichas'] || '',
      
      // Campos calculados
      dias_total: this.calculateProjectDays(row['Inicio_Captacao_Fichas'], row['Termino_Captacao_Fichas']),
      taxa_diaria_meta: this.calculateDailyRate(row['Meta_de_Fichas'], row['Inicio_Captacao_Fichas'], row['Termino_Captacao_Fichas'])
    })).filter(row => row.Agencia_e_Seletiva && row.Meta_de_Fichas > 0);
  }

  static async fetchMetasScouter(): Promise<any[]> {
    try {
      const data = await this.fetchSheetData(this.GIDS.metas_scouter);
      
      return data.map(row => ({
        scouter: (row.scouter || '').trim(),
        meta: parseInt(row.meta) || 0,
        inicio: row.inicio || '',
        termino: row.termino || '',
        projeto: (row.projeto || '').trim(),
        valor_por_ficha_override: this.parseMoneyBR(row.valor_por_ficha_override || '')
      })).filter(row => row.scouter && row.meta > 0);
    } catch (error) {
      console.warn('Aba Metas_Scouter não encontrada, retornando array vazio');
      return [];
    }
  }

  private static calculateProjectDays(inicio: string, termino: string): number {
    if (!inicio || !termino) return 0;
    
    try {
      const startDate = new Date(inicio);
      const endDate = new Date(termino);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays + 1); // +1 para incluir o dia de início
    } catch (error) {
      return 0;
    }
  }

  private static calculateDailyRate(meta: string, inicio: string, termino: string): number {
    const metaNum = parseInt(meta) || 0;
    const days = this.calculateProjectDays(inicio, termino);
    
    return days > 0 ? metaNum / days : 0;
  }
}
