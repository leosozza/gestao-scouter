// Tipo unificado para fichas com suporte a coordenadas e aliases
export interface FichaDataPoint {
  id: string | number;
  
  // Coordenadas (com aliases)
  latitude?: number;
  longitude?: number;
  lat?: number;  // Alias para latitude
  lng?: number;  // Alias para longitude
  
  // Campos principais
  projeto?: string;
  scouter?: string;
  nome?: string;
  telefone?: string;
  email?: string;
  idade?: string;
  
  // Datas
  criado?: string;
  data?: string;
  data_agendamento?: string;
  
  // Valores
  valor_ficha?: number;
  
  // Status e etapas
  etapa?: string;
  ficha_confirmada?: string;
  confirmado?: string;
  compareceu?: string;
  agendado?: string;
  tabulacao?: string;
  resultado_ligacao?: string;
  
  // Fotos
  foto?: string;
  foto_1?: string;
  cadastro_existe_foto?: string;
  
  // Localização e supervisão
  supervisor?: string;
  localizacao?: string;
  local_da_abordagem?: string;
  
  // Bitrix
  bitrix_id?: string;
  bitrix_status?: string;
  bitrix_synced_at?: string;
  
  // Metadata
  deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  raw?: any;
  
  // IDs de usuários
  scouter_user_id?: string;
  telemarketing_user_id?: string;
}
