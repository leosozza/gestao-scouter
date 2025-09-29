// Mock data service to simulate Google Sheets data for development/testing
// This provides realistic sample data when external APIs are unavailable

export class MockDataService {
  private static readonly sampleFichas = [
    {
      ID: '1',
      'Projetos Cormeciais': 'Campanha Fashion Week 2024',
      'Gestão de Scouter': 'CARLOS SILVA',
      'Criado': '15/09/2025',
      'Data de criação da Ficha': '15/09/2025 10:30',
      'Valor por Fichas': 'R$ 120,00',
      'Etapa': 'Lead a Qualificar',
      'Ficha paga': 'Sim',
      'Primeiro nome': 'Ana Carolina',
      'Nome do Modelo': 'Ana Carolina Santos',
      'Ficha confirmada': 'Sim',
      'Idade': '22',
      'Local da Abordagem': 'Shopping Center Norte',
      'Cadastro Existe Foto?': 'SIM',
      'Presença Confirmada': 'Sim',
      'Supervisor do Scouter': 'João Manager'
    },
    {
      ID: '2',
      'Projetos Cormeciais': 'Campanha Fashion Week 2024',
      'Gestão de Scouter': 'MARIA SANTOS',
      'Criado': '16/09/2025',
      'Data de criação da Ficha': '16/09/2025 14:45',
      'Valor por Fichas': 'R$ 120,00',
      'Etapa': 'Qualificado',
      'Ficha paga': 'Não',
      'Primeiro nome': 'Bruno',
      'Nome do Modelo': 'Bruno Oliveira',
      'Ficha confirmada': 'Não',
      'Idade': '25',
      'Local da Abordagem': 'Parque Ibirapuera',
      'Cadastro Existe Foto?': 'NÃO',
      'Presença Confirmada': 'Não',
      'Supervisor do Scouter': 'João Manager'
    },
    {
      ID: '3',
      'Projetos Cormeciais': 'Casting Verão 2025',
      'Gestão de Scouter': 'CARLOS SILVA',
      'Criado': '17/09/2025',
      'Data de criação da Ficha': '17/09/2025 09:15',
      'Valor por Fichas': 'R$ 150,00',
      'Etapa': 'Agendado',
      'Ficha paga': 'Sim',
      'Primeiro nome': 'Camila',
      'Nome do Modelo': 'Camila Rodrigues',
      'Ficha confirmada': 'Sim',
      'Idade': '19',
      'Local da Abordagem': 'Rua Oscar Freire',
      'Cadastro Existe Foto?': 'SIM',
      'Presença Confirmada': 'Sim',
      'Supervisor do Scouter': 'Maria Supervisor'
    },
    {
      ID: '4',
      'Projetos Cormeciais': 'Casting Verão 2025',
      'Gestão de Scouter': 'PEDRO COSTA',
      'Criado': '18/09/2025',
      'Data de criação da Ficha': '18/09/2025 16:20',
      'Valor por Fichas': 'R$ 150,00',
      'Etapa': 'Confirmado',
      'Ficha paga': 'Sim',
      'Primeiro nome': 'Diego',
      'Nome do Modelo': 'Diego Ferreira',
      'Ficha confirmada': 'Sim',
      'Idade': '23',
      'Local da Abordagem': 'Vila Madalena',
      'Cadastro Existe Foto?': 'SIM',
      'Presença Confirmada': 'Sim',
      'Supervisor do Scouter': 'Maria Supervisor'
    },
    {
      ID: '5',
      'Projetos Cormeciais': 'Campanha Fashion Week 2024',
      'Gestão de Scouter': 'MARIA SANTOS',
      'Criado': '19/09/2025',
      'Data de criação da Ficha': '19/09/2025 11:00',
      'Valor por Fichas': 'R$ 120,00',
      'Etapa': 'Não Qualificado',
      'Ficha paga': 'Não',
      'Primeiro nome': 'Elena',
      'Nome do Modelo': 'Elena Silva',
      'Ficha confirmada': 'Não',
      'Idade': '28',
      'Local da Abordagem': 'Barra Funda',
      'Cadastro Existe Foto?': 'SIM',
      'Presença Confirmada': 'Não',
      'Supervisor do Scouter': 'João Manager'
    },
    {
      ID: '6',
      'Projetos Cormeciais': 'Editorial Primavera',
      'Gestão de Scouter': 'ANA PEREIRA',
      'Criado': '20/09/2025',
      'Data de criação da Ficha': '20/09/2025 13:30',
      'Valor por Fichas': 'R$ 180,00',
      'Etapa': 'Lead a Qualificar',
      'Ficha paga': 'Sim',
      'Primeiro nome': 'Fernanda',
      'Nome do Modelo': 'Fernanda Lima',
      'Ficha confirmada': 'Sim',
      'Idade': '21',
      'Local da Abordagem': 'Paulista Avenue',
      'Cadastro Existe Foto?': 'SIM',
      'Presença Confirmada': 'Sim',
      'Supervisor do Scouter': 'Carlos Lead'
    },
    {
      ID: '7',
      'Projetos Cormeciais': 'Editorial Primavera',
      'Gestão de Scouter': 'PEDRO COSTA',
      'Criado': '21/09/2025',
      'Data de criação da Ficha': '21/09/2025 15:45',
      'Valor por Fichas': 'R$ 180,00',
      'Etapa': 'Qualificado',
      'Ficha paga': 'Sim',
      'Primeiro nome': 'Gabriel',
      'Nome do Modelo': 'Gabriel Almeida',
      'Ficha confirmada': 'Sim',
      'Idade': '24',
      'Local da Abordagem': 'Centro Histórico',
      'Cadastro Existe Foto?': 'SIM',
      'Presença Confirmada': 'Sim',
      'Supervisor do Scouter': 'Carlos Lead'
    },
    {
      ID: '8',
      'Projetos Cormeciais': 'Casting Verão 2025',
      'Gestão de Scouter': 'ANA PEREIRA',
      'Criado': '22/09/2025',
      'Data de criação da Ficha': '22/09/2025 08:15',
      'Valor por Fichas': 'R$ 150,00',
      'Etapa': 'Cancelado',
      'Ficha paga': 'Não',
      'Primeiro nome': 'Helena',
      'Nome do Modelo': 'Helena Costa',
      'Ficha confirmada': 'Não',
      'Idade': '20',
      'Local da Abordagem': 'Shopping Eldorado',
      'Cadastro Existe Foto?': 'NÃO',
      'Presença Confirmada': 'Não',
      'Supervisor do Scouter': 'Maria Supervisor'
    }
  ];

  private static readonly sampleProjetos = [
    {
      'agencia e seletiva': 'Campanha Fashion Week 2024',
      'Meta de fichas': '50',
      'Inicio Captação fichas': '01/09/2025',
      'Termino Captação fichas': '30/09/2025',
      'Meta Individual': '10'
    },
    {
      'agencia e seletiva': 'Casting Verão 2025',
      'Meta de fichas': '75',
      'Inicio Captação fichas': '15/09/2025',
      'Termino Captação fichas': '15/10/2025',
      'Meta Individual': '15'
    },
    {
      'agencia e seletiva': 'Editorial Primavera',
      'Meta de fichas': '30',
      'Inicio Captação fichas': '20/09/2025',
      'Termino Captação fichas': '10/10/2025',
      'Meta Individual': '8'
    }
  ];

  static async fetchFichas(): Promise<any[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('MockDataService: Usando dados simulados de fichas');
    
    // Process mock data similar to GoogleSheetsService
    const processedFichas = this.sampleFichas.map(ficha => ({
      ...ficha,
      // Campos processados
      valor_por_ficha_num: this.parseNumber(ficha['Valor por Fichas']),
      idade_num: this.parseNumber(ficha.Idade),
      tem_foto: ficha['Cadastro Existe Foto?'] === 'SIM',
      esta_paga: ficha['Ficha paga'] === 'Sim',
      
      // Normalização de status
      status_normalizado: this.normalizeStatus(ficha['Ficha confirmada']),
      etapa_normalizada: this.normalizeEtapa(ficha.Etapa)
    }));

    console.log(`MockDataService: ${processedFichas.length} fichas simuladas carregadas`);
    return processedFichas;
  }

  static async fetchProjetos(): Promise<any[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('MockDataService: Usando dados simulados de projetos');
    
    const processedProjetos = this.sampleProjetos.map(projeto => ({
      ...projeto,
      nome: projeto['agencia e seletiva'],
      meta_fichas: this.parseNumber(projeto['Meta de fichas']),
      inicio_captacao: this.parseDateOnly(projeto['Inicio Captação fichas']),
      termino_captacao: this.parseDateOnly(projeto['Termino Captação fichas']),
      meta_individual: this.parseNumber(projeto['Meta Individual']),
    }));

    console.log(`MockDataService: ${processedProjetos.length} projetos simulados carregados`);
    return processedProjetos;
  }

  static async fetchMetasScouter(): Promise<any[]> {
    console.log('MockDataService: Retornando array vazio para metas (não implementado)');
    return [];
  }

  private static normalizeStatus(status: string): string {
    if (!status) return 'Aguardando';
    
    const statusLower = status.toLowerCase().trim();
    
    if (statusLower.includes('sim') || statusLower.includes('confirmado')) {
      return 'Confirmado';
    } else if (statusLower.includes('não') || statusLower.includes('nao')) {
      return 'Não Confirmado';
    } else {
      return 'Aguardando';
    }
  }

  private static normalizeEtapa(etapa: string): string {
    if (!etapa) return 'Sem Etapa';
    
    const etapaLower = etapa.toLowerCase().trim();
    
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
    
    const cleaned = value.replace(/[^\d.,]/g, '');
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  private static parseDateOnly(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    try {
      const trimmed = dateStr.trim();
      const brDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = trimmed.match(brDateRegex);
      
      if (match) {
        const [, day, month, year] = match;
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (this.isValidDate(dateObj)) {
          return dateObj;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() > 1900;
  }

  static async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    const [fichas, projetos] = await Promise.all([
      this.fetchFichas(),
      this.fetchProjetos()
    ]);

    return {
      success: true,
      message: `Dados simulados carregados com sucesso! ${fichas.length} fichas e ${projetos.length} projetos.`,
      data: {
        fichas: fichas.length,
        projetos: projetos.length,
        camposDisponiveis: fichas.length > 0 ? Object.keys(fichas[0]) : []
      }
    };
  }
}