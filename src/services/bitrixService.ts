
import { supabase } from "@/integrations/supabase/client";

interface BitrixConfig {
  baseUrl: string;
  authMode: 'webhook' | 'oauth';
  webhookUserId?: string;
  webhookToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

interface BitrixResponse<T = any> {
  result: T;
  error?: {
    error: string;
    error_description: string;
  };
  total?: number;
  next?: number;
}

export class BitrixService {
  private config: BitrixConfig;

  constructor(config: BitrixConfig) {
    this.config = config;
  }

  private async makeRequest<T = any>(
    method: string,
    params: Record<string, any> = {}
  ): Promise<BitrixResponse<T>> {
    const { data, error } = await supabase.functions.invoke("bitrix-proxy", {
      body: {
        baseUrl: this.config.baseUrl,
        authMode: this.config.authMode,
        webhookUserId: this.config.webhookUserId,
        webhookToken: this.config.webhookToken,
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        refreshToken: this.config.refreshToken,
        method,
        params,
      },
    });

    if (error) {
      console.error("bitrix-proxy invocation error:", error);
      throw new Error(error.message || "Falha ao chamar proxy do Bitrix");
    }

    return data as BitrixResponse<T>;
  }

  // Test connection with real data structure
  async testConnection(): Promise<{
    leads: number;
    canConnect: boolean;
  }> {
    try {
      console.log("Testing Bitrix24 connection...");
      
      const response = await this.makeRequest('crm.lead.list', {
        select: ['ID', 'TITLE'],
        filter: { '>DATE_CREATE': '2024-01-01' },
        start: 0,
        limit: 5
      });

      console.log("Bitrix test response:", response);

      if (response.error) {
        throw new Error(`Bitrix API Error: ${response.error.error_description || response.error.error}`);
      }

      const leadsCount = response.result?.length || 0;
      
      return {
        leads: leadsCount,
        canConnect: true
      };
    } catch (error) {
      console.error('Test connection error:', error);
      throw error;
    }
  }

  // Get leads with proper field mapping
  async getLeads(params: {
    startDate?: string;
    endDate?: string;
    start?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      console.log("Fetching leads from Bitrix24...", params);
      
      const filter: Record<string, any> = {};
      
      if (params.startDate) {
        filter['>=DATE_CREATE'] = params.startDate;
      }
      
      if (params.endDate) {
        filter['<=DATE_CREATE'] = params.endDate;
      }

      const response = await this.makeRequest('crm.lead.list', {
        select: [
          'ID',
          'TITLE',
          'DATE_CREATE',
          'STAGE_ID',
          'NAME',
          'LAST_NAME',
          'PHONE',
          'MOBILE_PHONE',
          'EMAIL',
          // Campos customizados - estes podem variar dependendo da configuração
          'UF_CRM_*' // Pega todos os campos customizados
        ],
        filter,
        order: { 'DATE_CREATE': 'DESC' },
        start: params.start || 0,
        limit: params.limit || 50,
      });

      console.log("Bitrix leads response:", response);

      if (response.error) {
        throw new Error(`Erro ao buscar leads: ${response.error.error_description || response.error.error}`);
      }

      return response.result || [];
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  // Get all available user fields for leads to understand the mapping
  async getLeadFields(): Promise<any[]> {
    try {
      const response = await this.makeRequest('crm.lead.userfield.list');
      console.log("Lead fields:", response);
      return response.result || [];
    } catch (error) {
      console.error('Error fetching lead fields:', error);
      return [];
    }
  }

  // Update lead payment status
  async updateLeadPaymentStatus(leadIds: string[], status: string, date: string): Promise<void> {
    try {
      console.log("Updating payment status for leads:", leadIds);
      
      const commands: Record<string, string> = {};
      
      leadIds.forEach((id, index) => {
        commands[`cmd_${index}`] = `crm.lead.update?ID=${id}&FIELDS[UF_CRM_PAGAMENTO_STATUS]=${encodeURIComponent(status)}&FIELDS[UF_CRM_PAGAMENTO_DATA]=${encodeURIComponent(date)}`;
      });

      const response = await this.makeRequest('batch', { cmd: commands });
      
      if (response.error) {
        throw new Error(`Erro ao atualizar status: ${response.error.error_description || response.error.error}`);
      }

      console.log("Payment status updated successfully");
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  // Batch operations
  async executeBatch(commands: Record<string, string>): Promise<any> {
    const response = await this.makeRequest('batch', { 
      cmd: commands 
    });

    if (response.error) {
      throw new Error(`Erro no batch: ${response.error.error_description || response.error.error}`);
    }

    return response.result;
  }
}
