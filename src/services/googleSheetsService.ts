// Serviço para buscar dados das planilhas públicas do Google Sheets
export class GoogleSheetsService {
  private static readonly SPREADSHEET_ID = '14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o';
  
  // GIDs das abas
  private static readonly GIDS = {
    fichas: '452792639',
    projetos: '449483735'
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

  static async fetchFichas(): Promise<any[]> {
    const data = await this.fetchSheetData(this.GIDS.fichas);
    
    // Normalizar dados das fichas
    return data.map(row => ({
      ID: parseInt(row.ID) || 0,
      Projetos_Comerciais: row['Projetos_Cormeciais'] || row['Projetos_Comerciais'] || '', // Tratar typo
      Gestao_de_Scouter: row['Gestao_de_Scouter'] || '',
      Criado: row.Criado || '',
      Data_de_Criacao_da_Ficha: row['Data_de_Criacao_da_Ficha'] || '',
      MaxScouterApp_Verificacao: row['MaxScouterApp_Verificacao'] || '',
      Valor_por_Fichas: row['Valor_por_Fichas'] || 'R$ 0,00'
    })).filter(row => row.ID > 0 && row.Gestao_de_Scouter && row.Data_de_Criacao_da_Ficha);
  }

  static async fetchProjetos(): Promise<any[]> {
    const data = await this.fetchSheetData(this.GIDS.projetos);
    
    // Normalizar dados dos projetos
    return data.map(row => ({
      Agencia_e_Seletiva: row['Agencia_e_Seletiva'] || '',
      Meta_de_Fichas: parseInt(row['Meta_de_Fichas']) || 0,
      Inicio_Captacao_Fichas: row['Inicio_Captacao_Fichas'] || '',
      Termino_Captacao_Fichas: row['Termino_Captacao_Fichas'] || ''
    })).filter(row => row.Agencia_e_Seletiva && row.Meta_de_Fichas > 0);
  }

  static async fetchMetasScouter(): Promise<any[]> {
    // Por enquanto retorna array vazio, será implementado quando a aba for criada
    return [];
  }
}