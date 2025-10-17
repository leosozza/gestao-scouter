import { supabase } from '@/integrations/supabase/client';
import type { SyncLog } from './types';

/**
 * Create a sync log entry
 */
export async function createSyncLog(log: Omit<SyncLog, 'id' | 'created_at'>): Promise<SyncLog | null> {
  try {
    const logEntry: SyncLog = {
      ...log,
      created_at: new Date().toISOString(),
    };

    // Log to console
    console.log('📝 [SyncLog]', {
      endpoint: log.endpoint,
      table: log.table_name,
      status: log.status,
      records: log.records_count,
      time: log.execution_time_ms ? `${log.execution_time_ms}ms` : 'N/A',
      error: log.error_message,
    });

    // Try to save to Supabase if table exists
    try {
      const { data, error } = await supabase
        .from('sync_logs_detailed')
        .insert([logEntry])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (dbError) {
      // If table doesn't exist or other error, store in localStorage
      console.log('ℹ️ [SyncLogsRepo] Salvando log apenas no localStorage');
      const logs = getLocalSyncLogs();
      logs.unshift(logEntry);
      // Keep only last 100 logs
      const trimmedLogs = logs.slice(0, 100);
      localStorage.setItem('sync_logs_detailed', JSON.stringify(trimmedLogs));
      return logEntry;
    }
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao criar log:', error);
    return null;
  }
}

/**
 * Get recent sync logs
 */
export async function getSyncLogs(limit: number = 50): Promise<SyncLog[]> {
  try {
    // Try to get from Supabase first
    const { data, error } = await supabase
      .from('sync_logs_detailed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist, get from localStorage
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('ℹ️ [SyncLogsRepo] Usando logs do localStorage');
        return getLocalSyncLogs().slice(0, limit);
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao buscar logs:', error);
    return getLocalSyncLogs().slice(0, limit);
  }
}

/**
 * Get sync logs from localStorage
 */
function getLocalSyncLogs(): SyncLog[] {
  try {
    const stored = localStorage.getItem('sync_logs_detailed');
    if (stored) {
      return JSON.parse(stored) as SyncLog[];
    }
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao ler logs do localStorage:', error);
  }
  return [];
}

/**
 * Clear all sync logs
 */
export async function clearSyncLogs(): Promise<boolean> {
  try {
    // Clear from Supabase
    try {
      const { error } = await supabase
        .from('sync_logs_detailed')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (!error) {
        console.log('✅ [SyncLogsRepo] Logs limpos do Supabase');
      }
    } catch (dbError) {
      console.log('ℹ️ [SyncLogsRepo] Não foi possível limpar logs do Supabase');
    }

    // Clear from localStorage
    localStorage.removeItem('sync_logs_detailed');
    console.log('✅ [SyncLogsRepo] Logs limpos do localStorage');
    return true;
  } catch (error) {
    console.error('❌ [SyncLogsRepo] Erro ao limpar logs:', error);
    return false;
  }
}
