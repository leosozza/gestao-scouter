export interface FieldMapping {
  supabaseField: string;
  legacyAliases: string[];
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'coordinates';
  transformFunction?: string;
  isRequired: boolean;
  description?: string;
}

export const DEFAULT_FICHAS_MAPPINGS: FieldMapping[] = [
  {
    supabaseField: 'projeto',
    legacyAliases: [
      'Projetos Comerciais',
      'Projetos Cormeciais',
      'Projetos',
      'Projeto',
      'projetos',
      'projeto'
    ],
    dataType: 'text',
    isRequired: false,
    description: 'Nome do projeto comercial associado'
  },
  {
    supabaseField: 'scouter',
    legacyAliases: [
      'Gestão do Scouter',
      'Gestão de Scouter',
      'Scouter',
      'scouter',
      'Nome Scouter'
    ],
    dataType: 'text',
    isRequired: false,
    description: 'Nome do scouter responsável'
  },
  {
    supabaseField: 'criado',
    legacyAliases: [
      'Data_criacao_Ficha',
      'Data',
      'Criado',
      'criado',
      'Data de Criação',
      'Data Criação'
    ],
    dataType: 'date',
    isRequired: false,
    description: 'Data de criação da ficha'
  },
  {
    supabaseField: 'valor_ficha',
    legacyAliases: [
      'Valor por Fichas',
      'Valor Ficha',
      'Valor_ficha',
      'R$/Ficha',
      'Valor da Ficha',
      'Valor por Ficha',
      'valor'
    ],
    dataType: 'number',
    transformFunction: 'parseBRL',
    isRequired: false,
    description: 'Valor monetário da ficha'
  },
  {
    supabaseField: 'latitude',
    legacyAliases: ['lat', 'Latitude', 'latitude', 'LAT'],
    dataType: 'number',
    isRequired: false,
    description: 'Coordenada de latitude'
  },
  {
    supabaseField: 'longitude',
    legacyAliases: ['lng', 'lon', 'Longitude', 'longitude', 'LNG', 'LON'],
    dataType: 'number',
    isRequired: false,
    description: 'Coordenada de longitude'
  },
  {
    supabaseField: 'nome',
    legacyAliases: ['Nome', 'nome', 'Nome Completo', 'Nome do Candidato'],
    dataType: 'text',
    isRequired: true,
    description: 'Nome do candidato'
  },
  {
    supabaseField: 'telefone',
    legacyAliases: ['Telefone', 'telefone', 'Tel', 'Celular', 'Whatsapp'],
    dataType: 'text',
    isRequired: false,
    description: 'Telefone de contato'
  }
];
