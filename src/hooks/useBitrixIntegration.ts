import { useState, useCallback } from 'react';
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
  leadsProcessed?: number;
  leadsCreated?: number;
  leadsUpdated?: number;
  error?: string;
}

// Simplified hook since we're now using the new fichas structure
export const useBitrixIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  const testConnection = useCallback(async (config: BitrixConfig): Promise<boolean> => {
    toast({
      title: "Funcionalidade desabilitada",
      description: "O sistema agora usa apenas a nova estrutura do Google Sheets",
      variant: "default"
    });
    return false;
  }, [toast]);

  const syncData = useCallback(async (config: BitrixConfig): Promise<SyncResult> => {
    toast({
      title: "Funcionalidade desabilitada",
      description: "O sistema agora usa apenas a nova estrutura do Google Sheets",
      variant: "default"
    });
    return { success: false, error: "Bitrix integration disabled" };
  }, [toast]);

  const sendPayments = useCallback(async (
    config: BitrixConfig,
    leadIds: string[],
    dryRun: boolean = false
  ): Promise<boolean> => {
    toast({
      title: "Funcionalidade desabilitada",
      description: "O sistema agora usa apenas a nova estrutura do Google Sheets",
      variant: "default"
    });
    return false;
  }, [toast]);

  return {
    isConnected,
    isLoading,
    lastSync,
    testConnection,
    syncData,
    sendPayments,
  };
};