import { supabase } from '@/integrations/supabase/client';
import type { AppSettings } from './types';

export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching app settings:', error);
      return null;
    }

    if (!data) return null;

    // Convert Supabase types to our AppSettings type
    return {
      id: data.id,
      valor_base_ficha: data.valor_base_ficha,
      quality_threshold: data.quality_threshold,
      peso_foto: data.peso_foto,
      peso_confirmada: data.peso_confirmada,
      peso_contato: data.peso_contato,
      peso_agendado: data.peso_agendado,
      peso_compareceu: data.peso_compareceu,
      peso_interesse: data.peso_interesse,
      peso_concl_pos: data.peso_concl_pos,
      peso_concl_neg: data.peso_concl_neg,
      peso_sem_interesse_def: data.peso_sem_interesse_def,
      peso_sem_contato: data.peso_sem_contato,
      peso_sem_interesse_momento: data.peso_sem_interesse_momento,
      ajuda_custo_tier: data.ajuda_custo_tier as Record<string, number>,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return null;
  }
}

export async function saveAppSettings(settings: Omit<AppSettings, 'id' | 'updated_at'>): Promise<AppSettings | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(settings)
      .select()
      .single();

    if (error) {
      console.error('Error saving app settings:', error);
      return null;
    }

    // Convert Supabase types to our AppSettings type
    return {
      id: data.id,
      valor_base_ficha: data.valor_base_ficha,
      quality_threshold: data.quality_threshold,
      peso_foto: data.peso_foto,
      peso_confirmada: data.peso_confirmada,
      peso_contato: data.peso_contato,
      peso_agendado: data.peso_agendado,
      peso_compareceu: data.peso_compareceu,
      peso_interesse: data.peso_interesse,
      peso_concl_pos: data.peso_concl_pos,
      peso_concl_neg: data.peso_concl_neg,
      peso_sem_interesse_def: data.peso_sem_interesse_def,
      peso_sem_contato: data.peso_sem_contato,
      peso_sem_interesse_momento: data.peso_sem_interesse_momento,
      ajuda_custo_tier: data.ajuda_custo_tier as Record<string, number>,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('Error saving app settings:', error);
    return null;
  }
}