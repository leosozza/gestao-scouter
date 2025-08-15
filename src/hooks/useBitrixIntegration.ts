
import { useState, useCallback } from 'react';
import { BitrixService } from '@/services/bitrixService';
import { useToast } from '@/hooks/use-toast';

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
  leadsImported?: number;
  leadsUpdated?: number;
  projetosImported?: number;
  scoutersImported?: number;
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
        title: "Conexão bem-sucedida",
        description: `${result.leads} leads, ${result.projetos} projetos, ${result.scouters} scouters encontrados`
      });
      
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
      toast({
        title: "Erro na conexão",
        description: error instanceof Error ? error.message : "Verifique as credenciais",
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

    setIsLoading(true);
    try {
      const service = createService(config);
      const result: SyncResult = { success: true };

      // Sync leads if enabled
      if (config.enabledEntities.leads) {
        const leads = await service.getLeads({
          startDate: '2024-01-01',
        });
        result.leadsImported = leads.length;
      }

      // Sync projetos if enabled
      if (config.enabledEntities.projetos && config.spaIds.projetos) {
        const projetos = await service.getSPAItems(parseInt(config.spaIds.projetos));
        result.projetosImported = projetos.length;
      }

      // Sync scouters if enabled
      if (config.enabledEntities.scouters && config.spaIds.scouters) {
        const scouters = await service.getSPAItems(parseInt(config.spaIds.scouters));
        result.scoutersImported = scouters.length;
      }

      setLastSync(new Date());
      toast({
        title: "Sincronização concluída",
        description: `Dados importados com sucesso`
      });

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
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
