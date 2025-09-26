import { supabase } from '@/integrations/supabase/client';
import type { AppSettings } from './types';

export async function getAppSettings(): Promise<AppSettings | null> {
  // Como removemos a tabela app_settings, retornamos valores padrão
  return {
    valor_base_ficha: 10.00,
    quality_threshold: 50.00,
    peso_foto: 1.0,
    peso_confirmada: 1.0,
    peso_contato: 1.0,
    peso_agendado: 1.0,
    peso_compareceu: 1.0,
    peso_interesse: 1.0,
    peso_concl_pos: 1.0,
    peso_concl_neg: 1.0,
    peso_sem_interesse_def: 1.0,
    peso_sem_contato: 1.0,
    peso_sem_interesse_momento: 1.0,
    ajuda_custo_tier: {
      bronze: 200,
      prata: 250,
      ouro: 300,
      diamante: 350
    }
  };
}

export async function saveAppSettings(settings: Omit<AppSettings, 'id' | 'updated_at'>): Promise<AppSettings | null> {
  // Como removemos a tabela, apenas simulamos o salvamento
  console.log('Settings would be saved:', settings);
  return {
    id: 'default',
    updated_at: new Date().toISOString(),
    ...settings
  };
}