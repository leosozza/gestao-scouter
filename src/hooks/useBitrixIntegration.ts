
import { useState, useCallback } from 'react';
import { BitrixService } from '@/services/bitrixService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  createSyncRun, 
  completeSyncRun, 
  failSyncRun, 
  syncLeadsToSupabase 
} from '@/services/bitrixSupabaseSync';

interface BitrixConfig {
  enabled: boolean;
  authMode: 'webhook' | 'oauth';
  baseUrl: string;
  webhookUserId: string;
  webhookToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  enabledEntities: {
    leads: boolean;
    projetos: boolean;
    scouters: boolean;
  };
  spaIds: {
    projetos: string;
    scouters: string;
  };
}

interface SyncResult {
  success: boolean;
  leadsProcessed?: number;
  leadsCreated?: number;
  leadsUpdated?: number;
  error?: string;
}

export const useBitrixIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const createService = useCallback((config: BitrixConfig): BitrixService => {
    return new BitrixService({
      baseUrl: config.baseUrl,
      authMode: config.authMode,
      webhookUserId: config.webhookUserId,
      webhookToken: config.webhookToken,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
    });
  }, []);

  const testConnection = useCallback(async (config: BitrixConfig): Promise<boolean> => {
    if (!config.baseUrl) {
      toast({
        title: "URL obrigatória",
        description: "Configure a URL base do Bitrix24",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);
    try {
      const service = createService(config);
      const result = await service.testConnection();
      
      setIsConnected(true);
      toast({
        title: "Conexão bem-sucedida! ✅",
        description: `Encontrados ${result.leads} leads recentes no Bitrix24`
      });
      
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
      toast({
        title: "Erro na conexão",
        description: error instanceof Error ? error.message : "Verifique as credenciais do Bitrix24",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [createService, toast]);

  const syncData = useCallback(async (config: BitrixConfig): Promise<SyncResult> => {
    if (!isConnected) {
      toast({
        title: "Conexão necessária",
        description: "Teste a conexão antes de sincronizar",
        variant: "destructive"
      });
      return { success: false, error: "Not connected" };
    }

    // Verificar autenticação
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      toast({
        title: "Login necessário",
        description: "Faça login para sincronizar dados",
        variant: "destructive",
      });
      return { success: false, error: "Not authenticated" };
    }

    setIsLoading(true);
    const result: SyncResult = { success: true };
    let runId: string | null = null;

    try {
      const service = createService(config);

      // Criar registro de sincronização
      const run = await createSyncRun(authData.user.id, 'leads');
      runId = run?.id ?? null;

      console.log("Starting Bitrix24 sync...");

      // Sincronizar leads se habilitado
      if (config.enabledEntities.leads) {
        console.log("Syncing leads...");
        
        // Buscar leads do Bitrix24
        const leads = await service.getLeads({
          startDate: '2024-01-01', // Buscar leads desde início do ano
          limit: 100 // Começar com 100 registros
        });

        console.log("Fetched", leads.length, "leads from Bitrix24");

        // Sincronizar para Supabase
        const syncStats = await syncLeadsToSupabase(leads);
        
        result.leadsProcessed = syncStats.processed;
        result.leadsCreated = syncStats.created;
        result.leadsUpdated = syncStats.updated;

        console.log("Sync stats:", syncStats);
      }

      setLastSync(new Date());
      
      // Finalizar registro de sincronização
      if (runId) {
        await completeSyncRun(runId, {
          records_processed: result.leadsProcessed ?? 0,
          records_created: result.leadsCreated ?? 0,
          records_updated: result.leadsUpdated ?? 0,
          records_failed: 0
        });
      }

      toast({
        title: "Sincronização concluída! 🎉",
        description: `✅ ${result.leadsCreated || 0} leads criados, ${result.leadsUpdated || 0} atualizados`
      });

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      
      if (runId) {
        await failSyncRun(runId, error instanceof Error ? error.message : "Unknown error");
      }

      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });

      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      setIsLoading(false);
    }
  }, [createService, isConnected, toast]);

  const sendPayments = useCallback(async (
    config: BitrixConfig,
    leadIds: string[],
    dryRun: boolean = false
  ): Promise<boolean> => {
    if (!isConnected) {
      toast({
        title: "Conexão necessária",
        description: "Conecte ao Bitrix24 antes de enviar baixas",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);
    try {
      if (!dryRun) {
        const service = createService(config);
        const today = new Date().toISOString().split('T')[0];
        await service.updateLeadPaymentStatus(leadIds, 'PAGO', today);
      }

      toast({
        title: dryRun ? "Simulação concluída" : "Baixas enviadas",
        description: `${leadIds.length} itens ${dryRun ? 'seriam processados' : 'processados com sucesso'}`
      });

      return true;
    } catch (error) {
      console.error('Payment update failed:', error);
      toast({
        title: "Erro no envio",
        description: error instanceof Error ? error.message : "Não foi possível processar as baixas",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [createService, isConnected, toast]);

  return {
    isConnected,
    isLoading,
    lastSync,
    testConnection,
    syncData,
    sendPayments,
  };
};
