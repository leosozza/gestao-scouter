export type DataSource = 'bitrix' | 'sheets';

export interface LeadsFilters {
  scouter?: string;
  projeto?: string;       // ⚠️ usamos "projeto" no filtro e "projetos" no dado
  etapa?: string;
  dataInicio?: string;    // YYYY-MM-DD
  dataFim?: string;       // YYYY-MM-DD
}

export interface Lead {
  id: string;
  projetos: string;                  // ex.: "SELETIVA SANTO ANDRÉ-ABC"
  scouter: string;                   // nome do scouter
  criado?: string;                   // ISO
  data_criacao_ficha?: string;       // ISO
  valor_ficha?: number;
  etapa: string;
  nome: string;                      // responsável
  gerenciamentofunil?: string;
  etapafunil?: string;
  modelo: string;
  localizacao?: string;              // "lat,lng (endereço)" ou string livre
  ficha_confirmada?: string;         // "Sim" | "Não" | "Aguardando" | "Não confirmada"
  idade?: number;
  local_da_abordagem?: string;
  cadastro_existe_foto?: string;     // "SIM" | "NÃO" (mantido igual à origem)
  presenca_confirmada?: string;      // "Sim" | "Não"
  supervisor_do_scouter?: string;
}

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
