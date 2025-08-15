import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings, 
  Database, 
  TestTube, 
  RefreshCw, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Eye,
  EyeOff,
  Webhook
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  fieldMapping: {
    leads: {
      scouter: string;
      projeto: string;
      valorFicha: string;
      ajudaDia: string;
      pagamentoStatus: string;
      pagamentoData: string;
    };
    projetos: {
      metaFichas: string;
      inicioCaptacao: string;
      terminoCaptacao: string;
      statusMeta: string;
    };
    scouters: {
      valorFichaPadrao: string;
      banco: string;
      agencia: string;
      conta: string;
      ultimoPagamento: string;
    };
  };
}

interface ConnectionStatus {
  connected: boolean;
  lastSync: string | null;
  lastTest: string | null;
  logs: Array<{
    id: string;
    timestamp: string;
    type: 'sync' | 'test' | 'payment' | 'error';
    message: string;
    details?: any;
  }>;
}

const defaultConfig: BitrixConfig = {
  enabled: false,
  authMode: 'webhook',
  baseUrl: '',
  webhookUserId: '',
  webhookToken: '',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  enabledEntities: {
    leads: true,
    projetos: true,
    scouters: true,
  },
  spaIds: {
    projetos: '',
    scouters: '',
  },
  fieldMapping: {
    leads: {
      scouter: 'UF_CRM_SCOUTER',
      projeto: 'UF_CRM_PROJETO',
      valorFicha: 'UF_CRM_VALOR_FICHA',
      ajudaDia: 'UF_CRM_AJUDA_DIA',
      pagamentoStatus: 'UF_CRM_PAGAMENTO_STATUS',
      pagamentoData: 'UF_CRM_PAGAMENTO_DATA',
    },
    projetos: {
      metaFichas: 'UF_CRM_META_FICHAS',
      inicioCaptacao: 'UF_CRM_INICIO_CAPTACAO',
      terminoCaptacao: 'UF_CRM_TERMINO_CAPTACAO',
      statusMeta: 'UF_CRM_STATUS_META',
    },
    scouters: {
      valorFichaPadrao: 'UF_CRM_VALOR_FICHA_PADRAO',
      banco: 'UF_CRM_BANCO',
      agencia: 'UF_CRM_AGENCIA',
      conta: 'UF_CRM_CONTA',
      ultimoPagamento: 'UF_CRM_ULTIMO_PAGAMENTO',
    },
  },
};

export const BitrixIntegration = () => {
  const [config, setConfig] = useState<BitrixConfig>(defaultConfig);
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    lastSync: null,
    lastTest: null,
    logs: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem('bitrix_config');
      if (savedConfig) {
        setConfig({ ...defaultConfig, ...JSON.parse(savedConfig) });
      }
      
      const savedStatus = localStorage.getItem('bitrix_status');
      if (savedStatus) {
        setStatus(JSON.parse(savedStatus));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const saveConfig = () => {
    try {
      localStorage.setItem('bitrix_config', JSON.stringify(config));
      toast({
        title: "Configuração salva",
        description: "As configurações do Bitrix24 foram salvas com sucesso"
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'test' as const,
        message: 'Teste de conexão realizado com sucesso',
        details: {
          leadsCount: 150,
          projetosCount: 8,
          scoutersCount: 12
        }
      };

      const newStatus = {
        ...status,
        connected: true,
        lastTest: new Date().toISOString(),
        logs: [newLog, ...status.logs.slice(0, 9)]
      };

      setStatus(newStatus);
      localStorage.setItem('bitrix_status', JSON.stringify(newStatus));

      toast({
        title: "Conexão bem-sucedida",
        description: "150 leads, 8 projetos e 12 scouters encontrados"
      });
    } catch (error) {
      toast({
        title: "Erro na conexão",
        description: "Verifique as credenciais e tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncNow = async () => {
    if (!status.connected) {
      toast({
        title: "Conexão necessária",
        description: "Teste a conexão antes de sincronizar",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simular sincronização
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'sync' as const,
        message: 'Sincronização completa',
        details: {
          leadsImported: 12,
          leadsUpdated: 37,
          projetosImported: 2,
          scoutersImported: 1
        }
      };

      const newStatus = {
        ...status,
        lastSync: new Date().toISOString(),
        logs: [newLog, ...status.logs.slice(0, 9)]
      };

      setStatus(newStatus);
      localStorage.setItem('bitrix_status', JSON.stringify(newStatus));

      toast({
        title: "Sincronização concluída",
        description: "Dados importados: 12 novos leads, 2 projetos, 1 scouter"
      });
    } catch (error) {
      toast({
        title: "Erro na sincronização",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendPayments = async (dryRun = false) => {
    if (!status.connected) {
      toast({
        title: "Conexão necessária",
        description: "Conecte ao Bitrix24 antes de enviar baixas",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simular envio de baixas
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const newLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: 'payment' as const,
        message: dryRun ? 'Simulação de baixas concluída' : 'Baixas enviadas com sucesso',
        details: {
          dryRun,
          itemsCount: 42,
          totalValue: 'R$ 252,00'
        }
      };

      const newStatus = {
        ...status,
        logs: [newLog, ...status.logs.slice(0, 9)]
      };

      setStatus(newStatus);
      localStorage.setItem('bitrix_status', JSON.stringify(newStatus));

      toast({
        title: dryRun ? "Simulação concluída" : "Baixas enviadas",
        description: dryRun ? "42 itens seriam processados (R$ 252,00)" : "42 itens processados com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro no envio",
        description: "Não foi possível processar as baixas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'sync': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'test': return <TestTube className="h-4 w-4 text-green-500" />;
      case 'payment': return <Send className="h-4 w-4 text-purple-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Integração Bitrix24</h2>
          </div>
          <Badge variant={status.connected ? "default" : "secondary"}>
            {status.connected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
          />
          <span className="text-sm">Ativar integração</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="mapping">Mapeamento</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Autenticação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="base-url">URL Base do Bitrix24</Label>
                <Input
                  id="base-url"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://exemplo.bitrix24.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Modo de Autenticação</Label>
                <RadioGroup
                  value={config.authMode}
                  onValueChange={(value: 'webhook' | 'oauth') => setConfig(prev => ({ ...prev, authMode: value }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="webhook" id="webhook" />
                    <Label htmlFor="webhook">Webhook (recomendado)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oauth" id="oauth" />
                    <Label htmlFor="oauth">OAuth</Label>
                  </div>
                </RadioGroup>
              </div>

              {config.authMode === 'webhook' && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium">Configuração Webhook</h4>
                  
                  <div>
                    <Label htmlFor="webhook-user-id">User ID</Label>
                    <Input
                      id="webhook-user-id"
                      value={config.webhookUserId}
                      onChange={(e) => setConfig(prev => ({ ...prev, webhookUserId: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="webhook-token">Token</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="webhook-token"
                        type={showTokens ? "text" : "password"}
                        value={config.webhookToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, webhookToken: e.target.value }))}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowTokens(!showTokens)}
                      >
                        {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {config.authMode === 'oauth' && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium">Configuração OAuth</h4>
                  
                  <div>
                    <Label htmlFor="client-id">Client ID</Label>
                    <Input
                      id="client-id"
                      value={config.clientId}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="client-secret">Client Secret</Label>
                    <Input
                      id="client-secret"
                      type={showTokens ? "text" : "password"}
                      value={config.clientSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="refresh-token">Refresh Token</Label>
                    <Input
                      id="refresh-token"
                      type={showTokens ? "text" : "password"}
                      value={config.refreshToken}
                      onChange={(e) => setConfig(prev => ({ ...prev, refreshToken: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entidades e SPAs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">Entidades a integrar</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="leads"
                      checked={config.enabledEntities.leads}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          enabledEntities: { ...prev.enabledEntities, leads: checked as boolean }
                        }))
                      }
                    />
                    <Label htmlFor="leads">Leads</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projetos"
                      checked={config.enabledEntities.projetos}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          enabledEntities: { ...prev.enabledEntities, projetos: checked as boolean }
                        }))
                      }
                    />
                    <Label htmlFor="projetos">SPA - Projetos Comerciais</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="scouters"
                      checked={config.enabledEntities.scouters}
                      onCheckedChange={(checked) => 
                        setConfig(prev => ({
                          ...prev,
                          enabledEntities: { ...prev.enabledEntities, scouters: checked as boolean }
                        }))
                      }
                    />
                    <Label htmlFor="scouters">SPA - Scouter</Label>
                  </div>
                </div>
              </div>

              {(config.enabledEntities.projetos || config.enabledEntities.scouters) && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium">IDs dos SPAs</h4>
                  
                  {config.enabledEntities.projetos && (
                    <div>
                      <Label htmlFor="spa-projetos">Entity Type ID - Projetos Comerciais</Label>
                      <Input
                        id="spa-projetos"
                        value={config.spaIds.projetos}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          spaIds: { ...prev.spaIds, projetos: e.target.value }
                        }))}
                        placeholder="176"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {config.enabledEntities.scouters && (
                    <div>
                      <Label htmlFor="spa-scouters">Entity Type ID - Scouter</Label>
                      <Input
                        id="spa-scouters"
                        value={config.spaIds.scouters}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          spaIds: { ...prev.spaIds, scouters: e.target.value }
                        }))}
                        placeholder="177"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          {config.enabledEntities.leads && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapeamento - Leads</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lead-scouter">Campo Scouter</Label>
                    <Input
                      id="lead-scouter"
                      value={config.fieldMapping.leads.scouter}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          leads: { ...prev.fieldMapping.leads, scouter: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lead-projeto">Campo Projeto</Label>
                    <Input
                      id="lead-projeto"
                      value={config.fieldMapping.leads.projeto}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          leads: { ...prev.fieldMapping.leads, projeto: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lead-valor">Campo Valor Ficha</Label>
                    <Input
                      id="lead-valor"
                      value={config.fieldMapping.leads.valorFicha}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          leads: { ...prev.fieldMapping.leads, valorFicha: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="lead-pagamento-status">Campo Status Pagamento</Label>
                    <Input
                      id="lead-pagamento-status"
                      value={config.fieldMapping.leads.pagamentoStatus}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          leads: { ...prev.fieldMapping.leads, pagamentoStatus: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {config.enabledEntities.projetos && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapeamento - Projetos Comerciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projeto-meta">Campo Meta Fichas</Label>
                    <Input
                      id="projeto-meta"
                      value={config.fieldMapping.projetos.metaFichas}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          projetos: { ...prev.fieldMapping.projetos, metaFichas: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="projeto-inicio">Campo Início Captação</Label>
                    <Input
                      id="projeto-inicio"
                      value={config.fieldMapping.projetos.inicioCaptacao}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          projetos: { ...prev.fieldMapping.projetos, inicioCaptacao: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {config.enabledEntities.scouters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapeamento - Scouter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scouter-valor">Campo Valor Ficha Padrão</Label>
                    <Input
                      id="scouter-valor"
                      value={config.fieldMapping.scouters.valorFichaPadrao}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          scouters: { ...prev.fieldMapping.scouters, valorFichaPadrao: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scouter-banco">Campo Banco</Label>
                    <Input
                      id="scouter-banco"
                      value={config.fieldMapping.scouters.banco}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        fieldMapping: {
                          ...prev.fieldMapping,
                          scouters: { ...prev.fieldMapping.scouters, banco: e.target.value }
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={testConnection}
                  disabled={isLoading || !config.baseUrl}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>

                <Button
                  onClick={syncNow}
                  disabled={isLoading || !status.connected}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Agora
                </Button>

                <Button
                  onClick={() => sendPayments(true)}
                  disabled={isLoading || !status.connected}
                  variant="secondary"
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Simular Baixas
                </Button>

                <Button
                  onClick={() => sendPayments(false)}
                  disabled={isLoading || !status.connected}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Baixas
                </Button>
              </div>

              {status.connected && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Conectado ao Bitrix24</p>
                      <p className="text-sm text-green-600">
                        {status.lastTest && `Último teste: ${formatTimestamp(status.lastTest)}`}
                      </p>
                      <p className="text-sm text-green-600">
                        {status.lastSync && `Última sync: ${formatTimestamp(status.lastSync)}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Operações</CardTitle>
            </CardHeader>
            <CardContent>
              {status.logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhuma operação registrada ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {status.logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getLogIcon(log.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{log.message}</p>
                          <Badge variant="outline" className="text-xs">
                            {log.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </p>
                        {log.details && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {Object.entries(log.details).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadConfig}>
          Cancelar
        </Button>
        <Button onClick={saveConfig}>
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};
