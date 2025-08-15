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

  private async getAccessToken(): Promise<string> {
    if (this.config.authMode !== 'oauth') {
      throw new Error('OAuth not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/oauth/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
        refresh_token: this.config.refreshToken!,
      }),
    });

    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('OAuth refresh failed');
    }

    return data.access_token;
  }

  // Test connection
  async testConnection(): Promise<{
    leads: number;
    projetos: number;
    scouters: number;
  }> {
    try {
      const [leadsResponse, projetosResponse, scoutersResponse] = await Promise.all([
        this.makeRequest('crm.lead.list', {
          select: ['ID'],
          filter: { '>DATE_CREATE': '2024-01-01' },
          start: 0,
        }),
        this.makeRequest('crm.item.list', {
          entityTypeId: 176, // Example entity type ID
          select: ['id'],
          start: 0,
        }),
        this.makeRequest('crm.item.list', {
          entityTypeId: 177, // Example entity type ID
          select: ['id'],
          start: 0,
        }),
      ]);

      return {
        leads: leadsResponse.result?.length || 0,
        projetos: projetosResponse.result?.items?.length || 0,
        scouters: scoutersResponse.result?.items?.length || 0,
      };
    } catch (error) {
      console.error('Test connection error:', error);
      throw error;
    }
  }

  // Leads operations
  async getLeads(params: {
    startDate?: string;
    endDate?: string;
    start?: number;
    limit?: number;
  } = {}): Promise<any[]> {
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
        'UF_CRM_SCOUTER',
        'UF_CRM_PROJETO',
        'UF_CRM_VALOR_FICHA',
        'UF_CRM_PAGAMENTO_STATUS',
        'UF_CRM_PAGAMENTO_DATA',
      ],
      filter,
      order: { 'DATE_CREATE': 'ASC' },
      start: params.start || 0,
      limit: params.limit || 50,
    });

    return response.result || [];
  }

  async updateLeadPaymentStatus(leadIds: string[], status: string, date: string): Promise<void> {
    const commands: Record<string, string> = {};
    
    leadIds.forEach((id, index) => {
      commands[`c${index}`] = `crm.lead.update?ID=${id}&FIELDS[UF_CRM_PAGAMENTO_STATUS]=${status}&FIELDS[UF_CRM_PAGAMENTO_DATA]=${date}`;
    });

    await this.makeRequest('batch', { cmd: commands });
  }

  // SPA operations
  async getSPAItems(entityTypeId: number, params: {
    start?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    const response = await this.makeRequest('crm.item.list', {
      entityTypeId,
      select: ['id', 'title', 'ufCrm*', 'createdTime', 'updatedTime'],
      start: params.start || 0,
      limit: params.limit || 50,
    });

    return response.result?.items || [];
  }

  async createSPAItem(entityTypeId: number, fields: Record<string, any>): Promise<any> {
    const response = await this.makeRequest('crm.item.add', {
      entityTypeId,
      fields: {
        categoryId: 1,
        stageId: 'DT1:NEW',
        assignedById: 1,
        ...fields,
      },
    });

    return response.result;
  }

  async updateSPAItem(entityTypeId: number, id: string, fields: Record<string, any>): Promise<any> {
    const response = await this.makeRequest('crm.item.update', {
      entityTypeId,
      id,
      fields,
    });

    return response.result;
  }

  // Batch operations
  async executeBatch(commands: Record<string, string>): Promise<any> {
    const response = await this.makeRequest('batch', { 
      cmd: commands 
    });

    return response.result;
  }

  // Discovery methods for wizard
  async getSPATypes(): Promise<any[]> {
    const response = await this.makeRequest('crm.type.list');
    return response.result || [];
  }

  async getSPACategories(entityTypeId: number): Promise<any[]> {
    const response = await this.makeRequest('crm.item.category.list', {
      entityTypeId,
    });
    return response.result || [];
  }

  async getSPAStages(entityTypeId: number, categoryId: number): Promise<any[]> {
    const response = await this.makeRequest('crm.item.stage.list', {
      entityTypeId,
      categoryId,
    });
    return response.result || [];
  }

  async getSPAFields(entityTypeId: number): Promise<any[]> {
    const response = await this.makeRequest('crm.item.userfield.list', {
      entityTypeId,
    });
    return response.result || [];
  }

  async getLeadFields(): Promise<any[]> {
    const response = await this.makeRequest('crm.lead.userfield.list');
    return response.result || [];
  }
}
