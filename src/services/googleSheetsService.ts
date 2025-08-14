// Serviço para buscar dados das planilhas públicas do Google Sheets
export class GoogleSheetsService {
  private static readonly SPREADSHEET_ID = '14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o';
  
  // GIDs das abas conforme a planilha real
  private static readonly GIDS = {
    fichas: '0', // Aba principal com dados das fichas
    projetos: '449483735', // Aba com dados dos projetos
    metas_scouter: '452792639' // Aba com metas individuais dos scouters
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
      console.log(`Buscando dados da planilha: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log(`Dados recebidos (${csvText.length} caracteres)`);
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
    try {
      const data = await this.fetchSheetData(this.GIDS.fichas);
      console.log(`Fichas carregadas: ${data.length} registros`);
      console.log('Headers fichas:', data.length > 0 ? Object.keys(data[0]) : 'Nenhum');
      
      return data.map(row => {
        const processedRow = {
          ID: parseInt(row.ID) || Math.random() * 1000000,
          Projetos_Comerciais: row['Projetos_Comerciais'] || row['Projeto'] || row['Agencia'] || '',
          Gestao_de_Scouter: row['Gestao_de_Scouter'] || row['Scouter'] || row['Nome'] || '',
          Criado: row.Criado || row['Data_Criacao'] || '',
          Data_de_Criacao_da_Ficha: row['Data_de_Criacao_da_Ficha'] || row['Data'] || row.Criado || '',
          MaxScouterApp_Verificacao: row['MaxScouterApp_Verificacao'] || row['Verificacao'] || '',
          Valor_por_Fichas: row['Valor_por_Fichas'] || row['Valor'] || 'R$ 2,50',
          Campo_Local: row['Campo_Local'] || row['Local'] || row['Endereco'] || '',
          Tem_Foto: row['Tem_Foto'] || row['Foto'] || 'Não',
          Status_Confirmacao: row['Status_Confirmacao'] || row['Status'] || 'Aguardando',
          
          // Campos processados
          valor_por_ficha_num: this.parseMoneyBR(row['Valor_por_Fichas'] || row['Valor'] || '2.50'),
          geo: this.parseLatLon(row['Campo_Local'] || row['Local'] || ''),
          tem_foto: this.normalizeYesNo(row['Tem_Foto'] || row['Foto'] || ''),
          status_normalizado: (row['Status_Confirmacao'] || row['Status'] || 'Aguardando').trim()
        };
        
        return processedRow;
      }).filter(row => row.Gestao_de_Scouter && row.Projetos_Comerciais);
    } catch (error) {
      console.error('Erro ao carregar fichas:', error);
      throw error;
    }
  }

  static async fetchProjetos(): Promise<any[]> {
    try {
      const data = await this.fetchSheetData(this.GIDS.projetos);
      console.log(`Projetos carregados: ${data.length} registros`);
      console.log('Headers projetos:', data.length > 0 ? Object.keys(data[0]) : 'Nenhum');
      
      return data.map(row => ({
        agencia_e_seletiva: row['agencia_e_seletiva'] || row['Agencia_e_Seletiva'] || row['Projeto'] || '',
        meta_de_fichas: parseInt(row['meta_de_fichas'] || row['Meta_de_Fichas'] || row['Meta']) || 1000,
        inicio_captacao_fichas: row['inicio_captacao_fichas'] || row['Inicio_Captacao_Fichas'] || row['Inicio'] || '',
        termino_captacao_fichas: row['termino_captacao_fichas'] || row['Termino_Captacao_Fichas'] || row['Termino'] || '',
        meta_individual: parseInt(row['meta_individual'] || row['Meta_Individual']) || 500,
        
        // Campos calculados
        dias_total: this.calculateProjectDays(
          row['inicio_captacao_fichas'] || row['Inicio_Captacao_Fichas'] || row['Inicio'], 
          row['termino_captacao_fichas'] || row['Termino_Captacao_Fichas'] || row['Termino']
        ),
        taxa_diaria_meta: this.calculateDailyRate(
          row['meta_de_fichas'] || row['Meta_de_Fichas'] || row['Meta'], 
          row['inicio_captacao_fichas'] || row['Inicio_Captacao_Fichas'] || row['Inicio'], 
          row['termino_captacao_fichas'] || row['Termino_Captacao_Fichas'] || row['Termino']
        )
      })).filter(row => row.agencia_e_seletiva);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      throw error;
    }
  }

  static async fetchMetasScouter(): Promise<any[]> {
    try {
      const data = await this.fetchSheetData(this.GIDS.metas_scouter);
      console.log(`Metas scouter carregadas: ${data.length} registros`);
      console.log('Headers metas:', data.length > 0 ? Object.keys(data[0]) : 'Nenhum');
      
      return data.map(row => ({
        scouter: (row.scouter || row.Scouter || row.Nome || '').trim(),
        meta: parseInt(row.meta || row.Meta) || 0,
        inicio: row.inicio || row.Inicio || '',
        termino: row.termino || row.Termino || '',
        projeto: (row.projeto || row.Projeto || '').trim(),
        valor_por_ficha_override: this.parseMoneyBR(row.valor_por_ficha_override || row['Valor_Override'] || '')
      })).filter(row => row.scouter && row.meta > 0);
    } catch (error) {
      console.warn('Erro ao carregar metas scouter:', error);
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
