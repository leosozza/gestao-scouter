
export class GoogleSheetsService {
  private static readonly SPREADSHEET_ID = '14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o';
  
  // GIDs das abas da planilha
  private static readonly GIDS = {
    FICHAS: '452792639',
    PROJETOS: '449483735',
    METAS: '0' // Esta aba parece não existir, vamos usar um fallback
  };

  private static readonly BASE_URL = 'https://docs.google.com/spreadsheets/d';

  private static buildUrl(gid: string): string {
    return `${this.BASE_URL}/${this.SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
  }

  private static async fetchCsvData(gid: string): Promise<any[]> {
    try {
      const url = this.buildUrl(gid);
      console.log(`GoogleSheetsService: Buscando dados de ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) {
        console.error(`GoogleSheetsService: Erro HTTP ${response.status} para GID ${gid}`);
        
        // Se for erro 400, a aba pode não existir
        if (response.status === 400) {
          console.warn(`GoogleSheetsService: Aba com GID ${gid} não encontrada, retornando array vazio`);
          return [];
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log(`GoogleSheetsService: Recebidos ${csvText.length} caracteres de CSV para GID ${gid}`);
      
      if (!csvText.trim()) {
        console.warn(`GoogleSheetsService: CSV vazio para GID ${gid}`);
        return [];
      }

      return this.parseCsv(csvText);
    } catch (error) {
      console.error(`GoogleSheetsService: Erro ao buscar dados da aba ${gid}:`, error);
      throw error;
    }
  }

  private static parseCsv(csvText: string): any[] {
    try {
      const lines = csvText.trim().split('\n');
      
      if (lines.length === 0) {
        console.warn('GoogleSheetsService: CSV sem linhas');
        return [];
      }

      // Parse da primeira linha como cabeçalhos
      const headers = this.parseCsvLine(lines[0]);
      console.log(`GoogleSheetsService: Cabeçalhos encontrados:`, headers);

      if (lines.length === 1) {
        console.warn('GoogleSheetsService: CSV só tem cabeçalhos');
        return [];
      }

      // Parse das linhas de dados
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = this.parseCsvLine(lines[i]);
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
            
            // Processamento especial para campos numéricos
            if (header.toLowerCase().includes('valor') || header.toLowerCase().includes('meta') || header.toLowerCase().includes('idade')) {
              const numValue = parseFloat(values[index]);
              if (!isNaN(numValue)) {
                row[`${header}_num`] = numValue;
              }
            }
            
            // Processamento para datas
            if (header.toLowerCase().includes('data') || header.toLowerCase().includes('criado')) {
              const dateValue = this.parseDate(values[index]);
              if (dateValue) {
                row[`${header}_date`] = dateValue;
              }
            }
          });
          
          data.push(row);
        }
      }

      console.log(`GoogleSheetsService: Processadas ${data.length} linhas de dados`);
      return data;
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao fazer parse do CSV:', error);
      throw error;
    }
  }

  private static parseCsvLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private static parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    try {
      // Tenta diferentes formatos de data
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === formats[1]) { // YYYY-MM-DD
            return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else { // DD/MM/YYYY ou DD-MM-YYYY
            return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          }
        }
      }
      
      // Fallback para Date.parse
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        return new Date(parsed);
      }
      
      return null;
    } catch (error) {
      console.warn(`GoogleSheetsService: Erro ao fazer parse da data "${dateStr}":`, error);
      return null;
    }
  }

  static async fetchFichas(): Promise<any[]> {
    try {
      console.log('GoogleSheetsService: Buscando fichas...');
      const fichas = await this.fetchCsvData(this.GIDS.FICHAS);
      
      // Adiciona campos processados
      const processedFichas = fichas.map(ficha => ({
        ...ficha,
        // Normaliza campos principais
        scouter: ficha['Gestão de Scouter'] || ficha.Gestao_de_Scouter,
        projeto: ficha['Projetos Cormeciais'] || ficha.Projetos_Comerciais,
        data_criacao: ficha['Data de criação da Ficha'] || ficha.Data_de_Criacao_da_Ficha,
        tem_foto: ficha['Cadastro Existe Foto?'] === 'SIM' || ficha.tem_foto === 'Sim',
        status_normalizado: this.normalizeStatus(ficha['Ficha confirmada'] || ficha.status),
        valor_por_ficha_num: this.parseNumber(ficha['Valor por Fichas'] || ficha.valor_por_ficha),
        idade_num: this.parseNumber(ficha.Idade || ficha.idade),
      }));

      console.log(`GoogleSheetsService: ${processedFichas.length} fichas processadas`);
      return processedFichas;
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao buscar fichas:', error);
      return [];
    }
  }

  static async fetchProjetos(): Promise<any[]> {
    try {
      console.log('GoogleSheetsService: Buscando projetos...');
      const projetos = await this.fetchCsvData(this.GIDS.PROJETOS);
      
      // Processa projetos
      const processedProjetos = projetos.map(projeto => ({
        ...projeto,
        // Normaliza campos
        nome: projeto['agencia e seletiva'] || projeto.nome,
        meta_fichas: this.parseNumber(projeto['Meta de fichas'] || projeto.meta_fichas),
        inicio_captacao: this.parseDate(projeto['Inicio Captação fichas'] || projeto.inicio_captacao),
        termino_captacao: this.parseDate(projeto['Termino Captação fichas'] || projeto.termino_captacao),
        meta_individual: this.parseNumber(projeto['Meta Individual'] || projeto.meta_individual),
      }));

      console.log(`GoogleSheetsService: ${processedProjetos.length} projetos processados`);
      return processedProjetos;
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao buscar projetos:', error);
      return [];
    }
  }

  static async fetchMetasScouter(): Promise<any[]> {
    try {
      console.log('GoogleSheetsService: Buscando metas de scouter...');
      // Como a aba de metas não existe, retorna array vazio
      console.log('GoogleSheetsService: Aba de metas não configurada, retornando array vazio');
      return [];
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao buscar metas:', error);
      return [];
    }
  }

  private static normalizeStatus(status: string): string {
    if (!status) return 'Aguardando';
    
    const statusLower = status.toLowerCase().trim();
    
    if (statusLower.includes('confirmado') || statusLower.includes('confirmed')) {
      return 'Confirmado';
    } else if (statusLower.includes('não') || statusLower.includes('nao') || statusLower.includes('not')) {
      return 'Não Confirmado';
    } else {
      return 'Aguardando';
    }
  }

  private static parseNumber(value: string | number): number {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;
    
    // Remove caracteres não numéricos exceto ponto e vírgula
    const cleaned = value.replace(/[^\d.,]/g, '');
    
    // Substitui vírgula por ponto se for decimal brasileiro
    const normalized = cleaned.replace(',', '.');
    
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Método para testar a conexão
  static async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log('GoogleSheetsService: Testando conexão...');
      
      const [fichas, projetos] = await Promise.all([
        this.fetchFichas(),
        this.fetchProjetos()
      ]);

      const success = fichas.length > 0 || projetos.length > 0;
      
      return {
        success,
        message: success 
          ? `Conexão bem-sucedida! ${fichas.length} fichas e ${projetos.length} projetos encontrados.`
          : 'Conexão estabelecida, mas nenhum dado foi encontrado.',
        data: {
          fichas: fichas.length,
          projetos: projetos.length
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
}
