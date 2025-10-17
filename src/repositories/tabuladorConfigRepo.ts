import { supabase } from '@/integrations/supabase/client';
import type { TabuladorMaxConfig } from './types';

/**
 * Get TabuladorMax configuration from localStorage (temporary storage)
 * In production, this should be stored in a secure backend or environment variables
 */
export async function getTabuladorConfig(): Promise<TabuladorMaxConfig | null> {
  try {
    console.log('🔍 [TabuladorConfigRepo] Buscando configuração do TabuladorMax...');
    
    // Try to get from localStorage first
    const stored = localStorage.getItem('tabuladormax_config');
    if (stored) {
      const config = JSON.parse(stored) as TabuladorMaxConfig;
      console.log('✅ [TabuladorConfigRepo] Configuração carregada do localStorage');
      return config;
    }

    // Try to get from Supabase table if it exists
    const { data, error } = await supabase
      .from('tabulador_config')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      // Table might not exist, that's OK - we'll use localStorage
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('ℹ️ [TabuladorConfigRepo] Tabela tabulador_config não existe, usando localStorage');
        return getDefaultConfig();
      }
      console.error('❌ [TabuladorConfigRepo] Erro ao buscar configuração:', error);
      return getDefaultConfig();
    }

    if (data) {
      // Store in localStorage for quick access
      localStorage.setItem('tabuladormax_config', JSON.stringify(data));
      console.log('✅ [TabuladorConfigRepo] Configuração carregada do Supabase');
      return data;
    }

    return getDefaultConfig();
  } catch (error) {
    console.error('❌ [TabuladorConfigRepo] Exceção ao buscar configuração:', error);
    return getDefaultConfig();
  }
}

/**
 * Save TabuladorMax configuration to localStorage and optionally to Supabase
 */
export async function saveTabuladorConfig(config: Omit<TabuladorMaxConfig, 'id' | 'created_at' | 'updated_at'>): Promise<TabuladorMaxConfig | null> {
  try {
    console.log('💾 [TabuladorConfigRepo] Salvando configuração do TabuladorMax...');
    
    const configWithTimestamp: TabuladorMaxConfig = {
      ...config,
      updated_at: new Date().toISOString(),
    };

    // Always save to localStorage
    localStorage.setItem('tabuladormax_config', JSON.stringify(configWithTimestamp));
    console.log('✅ [TabuladorConfigRepo] Configuração salva no localStorage');

    // Try to save to Supabase if table exists
    try {
      const existing = await getTabuladorConfig();
      
      if (existing && existing.id) {
        // Update existing
        const { data, error } = await supabase
          .from('tabulador_config')
          .update(configWithTimestamp)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        console.log('✅ [TabuladorConfigRepo] Configuração atualizada no Supabase');
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('tabulador_config')
          .insert([{ ...configWithTimestamp, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;
        console.log('✅ [TabuladorConfigRepo] Configuração criada no Supabase');
        return data;
      }
    } catch (dbError) {
      // If Supabase save fails, that's OK - we have localStorage
      console.log('ℹ️ [TabuladorConfigRepo] Não foi possível salvar no Supabase, usando apenas localStorage');
      return configWithTimestamp;
    }
  } catch (error) {
    console.error('❌ [TabuladorConfigRepo] Exceção ao salvar configuração:', error);
    return null;
  }
}

/**
 * Get default TabuladorMax configuration
 */
function getDefaultConfig(): TabuladorMaxConfig {
  return {
    project_id: 'gkvvtfqfggddzotxltxf',
    url: 'https://gkvvtfqfggddzotxltxf.supabase.co',
    publishable_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdnZ0ZnFmZ2dkZHpvdHhsdHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDI0MzgsImV4cCI6MjA3NTQxODQzOH0.8WtKh58rp6ql2W3tQq9hLntv07ZyIFFE5kDRPcvnplU',
    enabled: true,
  };
}

/**
 * Test connection to TabuladorMax
 */
export async function testTabuladorConnection(config: TabuladorMaxConfig): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    console.log('🧪 [TabuladorConfigRepo] Testando conexão com TabuladorMax...');
    console.log('📡 [TabuladorConfigRepo] URL:', config.url);
    console.log('🔑 [TabuladorConfigRepo] Project ID:', config.project_id);

    // Create a temporary Supabase client with TabuladorMax credentials
    const { createClient } = await import('@supabase/supabase-js');
    const tabuladorClient = createClient(config.url, config.publishable_key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Try to query the leads table
    const { data, error, count } = await tabuladorClient
      .from('leads')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('❌ [TabuladorConfigRepo] Erro ao testar conexão:', error);
      return {
        success: false,
        message: `Erro: ${error.message} (Código: ${error.code})`,
      };
    }

    console.log('✅ [TabuladorConfigRepo] Conexão bem-sucedida!');
    console.log(`📊 [TabuladorConfigRepo] Total de leads: ${count ?? 0}`);

    return {
      success: true,
      message: `Conexão bem-sucedida! Encontrados ${count ?? 0} leads na tabela.`,
      count: count ?? 0,
    };
  } catch (error) {
    console.error('❌ [TabuladorConfigRepo] Exceção ao testar conexão:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido ao testar conexão',
    };
  }
}
