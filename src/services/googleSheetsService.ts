
// Type for raw CSV row data
interface CsvRow {
  [key: string]: string | number | Date | boolean | null | undefined;
}

export class GoogleSheetsService {
  private static readonly SPREADSHEET_ID = '14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o';
  
  // GIDs das abas da planilha
  private static readonly GIDS = {
    FICHAS: '452792639',
    PROJETOS: '449483735',
    SCOUTERS: '1351167110', // Aba de Scouters ativos
    METAS: '0' // Esta aba parece não existir, vamos usar um fallback
  };

  private static readonly BASE_URL = 'https://docs.google.com/spreadsheets/d';

  private static buildUrl(gid: string): string {
    // Use proxy in development to avoid CORS issues
    if (import.meta.env.DEV) {
      return `/api/sheets/${this.SPREADSHEET_ID}/${gid}`;
    }
    return `${this.BASE_URL}/${this.SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
  }

  private static async fetchCsvData(gid: string): Promise<CsvRow[]> {
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
      
      // Fallback to mock data in case of network/CORS issues
      console.warn(`GoogleSheetsService: Usando dados simulados como fallback devido ao erro: ${error.message}`);
      const { MockDataService } = await import('./mockDataService');
      
      if (gid === this.GIDS.FICHAS) {
        const mockFichas = await MockDataService.fetchFichas();
        return mockFichas;
      } else if (gid === this.GIDS.PROJETOS) {
        return await MockDataService.fetchProjetos();
      } else if (gid === this.GIDS.SCOUTERS) {
        // For scouters, return empty array if fetch fails - we'll fallback to deriving from fichas
        return [];
      }
      
      return [];
    }
  }

  private static parseCsv(csvText: string): CsvRow[] {
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
      const data: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = this.parseCsvLine(lines[i]);
          const row: CsvRow = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
            
            // Processamento especial para campos numéricos
            if (header.toLowerCase().includes('valor') || header.toLowerCase().includes('meta') || header.toLowerCase().includes('idade')) {
              const numValue = parseFloat(values[index]);
              if (!isNaN(numValue)) {
                row[`${header}_num`] = numValue;
              }
            }
            
            // Processamento especial para a data "Criado" (apenas data DD/MM/YYYY)
            if (header === 'Criado') {
              const dateValue = this.parseDateOnly(values[index]);
              if (dateValue) {
                row[`${header}_date`] = dateValue;
              }
            }
            
            // Processamento para datas com hora ("Data de criação da Ficha")
            if (header === 'Data de criação da Ficha') {
              const dateTimeValue = this.parseDateTime(values[index]);
              if (dateTimeValue) {
                row[`${header}_datetime`] = dateTimeValue;
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

  // Parse apenas data no formato DD/MM/YYYY
  private static parseDateOnly(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    try {
      const trimmed = dateStr.trim();
      
      // Parse formato brasileiro dd/MM/yyyy
      const brDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = trimmed.match(brDateRegex);
      
      if (match) {
        const [, day, month, year] = match;
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (this.isValidDate(dateObj)) {
          return dateObj;
        }
      }
      
      console.warn('GoogleSheetsService: Formato de data não reconhecido para "Criado":', dateStr);
      return null;

    } catch (error) {
      console.error('GoogleSheetsService: Erro ao fazer parse da data "Criado":', error, 'valor:', dateStr);
      return null;
    }
  }

  // Parse data e hora no formato DD/MM/YYYY HH:MM
  private static parseDateTime(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    try {
      const trimmed = dateStr.trim();
      
      // Se já é ISO format, usa direto
      if (trimmed.includes('T') || trimmed.includes('Z')) {
        const isoDate = new Date(trimmed);
        if (this.isValidDate(isoDate)) {
          return isoDate;
        }
      }

      // Parse formato brasileiro dd/MM/yyyy HH:mm
      const brDateTimeRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/;
      const match = trimmed.match(brDateTimeRegex);
      
      if (match) {
        const [, day, month, year, hour, minute] = match;
        // Criar data no timezone local
        const dateObj = new Date(
          parseInt(year), 
          parseInt(month) - 1, // JavaScript months are 0-indexed
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );

        if (this.isValidDate(dateObj)) {
          return dateObj;
        }
      }

      // Fallback: tentar apenas data dd/MM/yyyy
      const dateOnlyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const dateMatch = trimmed.match(dateOnlyRegex);
      
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (this.isValidDate(dateObj)) {
          return dateObj;
        }
      }

      console.warn('GoogleSheetsService: Formato de data/hora não reconhecido:', dateStr);
      return null;

    } catch (error) {
      console.error('GoogleSheetsService: Erro ao fazer parse da data/hora:', error, 'valor:', dateStr);
      return null;
    }
  }

  // Helper para verificar se uma data é válida
  private static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() > 1900;
  }

  static async fetchFichas(): Promise<CsvRow[]> {
    try {
      console.log('GoogleSheetsService: Buscando fichas...');
      const fichas = await this.fetchCsvData(this.GIDS.FICHAS);
      
      // Log dos campos encontrados para debug
      if (fichas.length > 0) {
        console.log('GoogleSheetsService: Campos disponíveis na primeira ficha:', Object.keys(fichas[0]));
        console.log('GoogleSheetsService: Primeira ficha completa:', fichas[0]);
      }
      
      // Processar fichas com campos corretos
      const processedFichas = fichas.map(ficha => ({
        ...ficha,
        // Garantir que os campos principais estão disponíveis
        ID: ficha.ID,
        'Projetos Cormeciais': ficha['Projetos Cormeciais'],
        'Gestão de Scouter': ficha['Gestão de Scouter'],
        'Criado': ficha.Criado, // Data apenas
        'Data de criação da Ficha': ficha['Data de criação da Ficha'], // Data e hora
        'Valor por Fichas': ficha['Valor por Fichas'],
        'Etapa': ficha.Etapa, // Para o funil
        'Ficha paga': ficha['Ficha paga'], // Status de pagamento
        'Primeiro nome': ficha['Primeiro nome'],
        'Nome do Modelo': ficha['Nome do Modelo'],
        'Ficha confirmada': ficha['Ficha confirmada'],
        'Idade': ficha.Idade,
        'Local da Abordagem': ficha['Local da Abordagem'],
        'Cadastro Existe Foto?': ficha['Cadastro Existe Foto?'],
        'Presença Confirmada': ficha['Presença Confirmada'],
        'Supervisor do Scouter': ficha['Supervisor do Scouter'],
        
        // Campos processados
        valor_por_ficha_num: this.parseNumber(ficha['Valor por Fichas']),
        idade_num: this.parseNumber(ficha.Idade),
        tem_foto: ficha['Cadastro Existe Foto?'] === 'SIM',
        esta_paga: ficha['Ficha paga'] === 'Sim',
        
        // Normalização de status
        status_normalizado: this.normalizeStatus(ficha['Ficha confirmada']),
        etapa_normalizada: this.normalizeEtapa(ficha.Etapa)
      }));

      console.log(`GoogleSheetsService: ${processedFichas.length} fichas processadas com sucesso`);
      return processedFichas;
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao buscar fichas:', error);
      
      // Emergency fallback to mock data
      console.warn('GoogleSheetsService: Usando mock data como último recurso');
      const { MockDataService } = await import('./mockDataService');
      return await MockDataService.fetchFichas();
    }
  }

  static async fetchProjetos(): Promise<CsvRow[]> {
    try {
      console.log('GoogleSheetsService: Buscando projetos...');
      const projetos = await this.fetchCsvData(this.GIDS.PROJETOS);
      
      // Processa projetos
      const processedProjetos = projetos.map(projeto => ({
        ...projeto,
        // Normaliza campos
        nome: projeto['agencia e seletiva'] || projeto.nome,
        meta_fichas: this.parseNumber(projeto['Meta de fichas'] || projeto.meta_fichas),
        inicio_captacao: this.parseDateOnly(projeto['Inicio Captação fichas'] || projeto.inicio_captacao),
        termino_captacao: this.parseDateOnly(projeto['Termino Captação fichas'] || projeto.termino_captacao),
        meta_individual: this.parseNumber(projeto['Meta Individual'] || projeto.meta_individual),
      }));

      console.log(`GoogleSheetsService: ${processedProjetos.length} projetos processados`);
      return processedProjetos;
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao buscar projetos:', error);
      return [];
    }
  }

  static async fetchMetasScouter(): Promise<CsvRow[]> {
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

  static async fetchScouters(): Promise<CsvRow[]> {
    try {
      console.log('GoogleSheetsService: Buscando scouters da aba dedicada...');
      const scouters = await this.fetchCsvData(this.GIDS.SCOUTERS);
      
      if (scouters.length > 0) {
        console.log('GoogleSheetsService: Campos disponíveis no primeiro scouter:', Object.keys(scouters[0]));
        console.log('GoogleSheetsService: Primeiro scouter completo:', scouters[0]);
      }
      
      // Processar scouters com campos corretos
      // Expected columns from the Scouters sheet:
      // - Nome / Scouter / Nome do Scouter: Scouter's name
      // - Tier / Classificação / Nivel: Scouter's tier/level
      // - Status / Situação / Ativo: Active status (ativo, inativo, etc.)
      // - Meta Semanal / Meta / Meta/Semana: Weekly goal number
      const processedScouters = scouters.map(scouter => ({
        ...scouter,
        // Mapear campos comuns da planilha de scouters
        // Os campos exatos podem variar, então tentamos várias variações
        nome: scouter['Nome'] || scouter['Scouter'] || scouter['Nome do Scouter'],
        tier: scouter['Tier'] || scouter['Classificação'] || scouter['Nivel'],
        status: scouter['Status'] || scouter['Situação'],
        meta_semanal: this.parseNumber(scouter['Meta Semanal'] || scouter['Meta'] || scouter['Meta/Semana']),
        ativo: this.parseAtivo(scouter['Status'] || scouter['Ativo'] || scouter['Situação']),
      }));

      console.log(`GoogleSheetsService: ${processedScouters.length} scouters processados da aba dedicada`);
      console.log(`GoogleSheetsService: Scouters ativos: ${processedScouters.filter(s => s.ativo).length}`);
      return processedScouters;
    } catch (error) {
      console.error('GoogleSheetsService: Erro ao buscar scouters:', error);
      // Return empty array to fallback to ficha-based scouter extraction
      return [];
    }
  }

  private static parseAtivo(status: string): boolean {
    if (!status || typeof status !== 'string') return true; // Default to active
    
    const statusLower = status.toLowerCase().trim();
    
    // Considerar ativo se:
    // - Status contém "ativo" ou "ativa"
    // - Status não contém palavras que indicam inativo
    const inactiveKeywords = ['inativo', 'inativa', 'desligado', 'desligada', 'pausado', 'férias', 'ferias', 'afastado'];
    const isInactive = inactiveKeywords.some(keyword => statusLower.includes(keyword));
    
    if (isInactive) return false;
    
    // Se status é "ativo" explicitamente, retorna true
    if (statusLower.includes('ativo') || statusLower.includes('ativa')) return true;
    
    // Default: considerar ativo se não foi marcado como inativo
    return true;
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

  private static normalizeEtapa(etapa: string): string {
    if (!etapa) return 'Sem Etapa';
    
    const etapaLower = etapa.toLowerCase().trim();
    
    // Mapeamento de etapas conhecidas
    const etapaMap: Record<string, string> = {
      'lead a qualificar': 'Lead a Qualificar',
      'qualificado': 'Qualificado',
      'agendado': 'Agendado',
      'confirmado': 'Confirmado',
      'cancelado': 'Cancelado',
      'não qualificado': 'Não Qualificado',
      'nao qualificado': 'Não Qualificado'
    };
    
    return etapaMap[etapaLower] || etapa;
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
  static async testConnection(): Promise<{ 
    success: boolean; 
    message: string; 
    data?: {
      fichas: number;
      projetos: number;
      scouters: number;
      scoutersAtivos: number;
      camposDisponiveis: string[];
    }
  }> {
    try {
      console.log('GoogleSheetsService: Testando conexão...');
      
      const [fichas, projetos, scouters] = await Promise.all([
        this.fetchFichas(),
        this.fetchProjetos(),
        this.fetchScouters()
      ]);

      const success = fichas.length > 0 || projetos.length > 0 || scouters.length > 0;
      
      return {
        success,
        message: success 
          ? `Conexão bem-sucedida! ${fichas.length} fichas, ${projetos.length} projetos e ${scouters.length} scouters encontrados.`
          : 'Conexão estabelecida, mas nenhum dado foi encontrado.',
        data: {
          fichas: fichas.length,
          projetos: projetos.length,
          scouters: scouters.length,
          scoutersAtivos: scouters.filter(s => s.ativo).length,
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

  // Método para atualizar campo "Ficha paga" (simulação - implementação real requer API write do Google Sheets)
  static async updateFichaPagaStatus(fichaIds: string[], status: 'Sim' | 'Não'): Promise<void> {
    console.log(`GoogleSheetsService: Simulando atualização de "Ficha paga" para ${status}:`, fichaIds);
    
    // Aqui seria implementada a atualização real via Google Sheets API
    // Por enquanto, apenas simula o delay de uma operação real
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`GoogleSheetsService: Atualização simulada concluída para ${fichaIds.length} fichas`);
    
    // Em uma implementação real, seria necessário:
    // 1. Configurar autenticação OAuth2 do Google
    // 2. Usar a Google Sheets API v4 para atualizar as células
    // 3. Encontrar as linhas corretas baseadas no ID
    // 4. Atualizar a coluna "Ficha paga" com o novo status
  }
}
