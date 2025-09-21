export interface Lead {
  id: string;
  projetos: string;
  scouter: string;
  criado?: string;        // ISO
  data_criacao_ficha?: string; // ISO
  valor_ficha?: number;
  etapa: string;
  nome: string;
  gerenciamentofunil?: string;
  etapafunil?: string;
  modelo: string;
  localizacao?: string;   // ou "lat,lng (endereco)" simples
  ficha_confirmada?: string; // "Sim" | "Não" | "Aguardando" | "Não confirmada"
  idade?: number;
  local_da_abordagem?: string;
  cadastro_existe_foto?: string; // "Sim"/"NÃO"
  presenca_confirmada?: string;  // "Sim"/"Não"
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

export interface LeadsFilters {
  scouter?: string;
  projeto?: string;
  etapa?: string;
  dataInicio?: string;
  dataFim?: string;
}