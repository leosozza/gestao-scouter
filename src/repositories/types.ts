export type DataSource = 'bitrix' | 'sheets';

export interface Project {
  nome?: string;
  'Agencia e Seletiva'?: string | number | boolean | Date;
  'agencia e seletiva'?: string;
  'Meta de Fichas'?: string | number | boolean | Date;
  valorAjudaCusto?: number | string;
  valorFolgaRemunerada?: number | string;
}

export interface LeadsFilters {
  scouter?: string;
  projeto?: string;       // ⚠️ usamos "projeto" no filtro e "projetos" no dado
  etapa?: string;
  dataInicio?: string;    // YYYY-MM-DD
  dataFim?: string;       // YYYY-MM-DD
}

export interface Ficha {
  id?: number;  // Opcional para compatibilidade com Google Sheets
  ID?: string | number | boolean | Date;  // Google Sheets compatibility
  projetos?: string;
  Projetos?: string;  // Google Sheets compatibility
  scouter?: string;
  Scouter?: string;  // Google Sheets compatibility
  criado?: string |  boolean | Date;  // formato dd/MM/yyyy
  Criado?: string | number | boolean | Date;  // Google Sheets compatibility
  hora_criacao_ficha?: string;          // formato HH:mm
  valor_ficha?: string | number;        // formato brasileiro com vírgula ou número
  etapa?: string;
  nome?: string;
  gerenciamentofunil?: string;
  etapafunil?: string;
  modelo?: string;
  localizacao?: string;
  ficha_confirmada?: string;            // "Aguardando" | "Confirmada" | etc
  idade?: string;                       // pode ser número como string
  local_da_abordagem?: string;
  cadastro_existe_foto?: string;        // "SIM" | "NÃO"
  presenca_confirmada?: string;         // "Sim" | "Não"
  supervisor_do_scouter?: string;
  data_confirmacao_ficha?: string;
  foto?: string;                        // "1" | "0"
  compareceu?: string | number;         // "1" | "0" ou 1 | 0
  confirmado?: string | number | boolean; // "1" | "0" ou 1 | 0 ou true | false
  tem_foto?: string | boolean;          // Para compatibilidade
  datahoracel?: string;                 // formato dd/MM/yyyy HH:mm
  funilfichas?: string;
  tabulacao?: string;
  agendado?: string;                    // "1" | "0"
  qdoagendou?: string;
  created_at?: string;
  updated_at?: string;
}

// Para compatibilidade com o código existente  
export type Lead = Ficha;

export interface AppSettings {
  id?: string;
  valor_base_ficha: number;
  quality_threshold: number;
  peso_foto: number;
  peso_confirmada: number;
  peso_contato: number;
  peso_agendado: number;
  peso_compareceu: number;
  peso_interesse: number;
  peso_concl_pos: number;
  peso_concl_neg: number;
  peso_sem_interesse_def: number;
  peso_sem_contato: number;
  peso_sem_interesse_momento: number;
  ajuda_custo_tier: Record<string, number>;
  updated_at?: string;
}
