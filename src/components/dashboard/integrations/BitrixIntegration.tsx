import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBitrixIntegration } from "@/hooks/useBitrixIntegration";
import { useToast } from "@/hooks/use-toast";
import { BitrixOAuthHelper } from "./BitrixOAuthHelper";

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

export const BitrixIntegration = () => {
  const [config, setConfig] = useState<BitrixConfig>({
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
  });

  const [showTokens, setShowTokens] = useState({
    webhookToken: false,
    clientSecret: false,
    refreshToken: false,
  });

  const { isConnected, isLoading, lastSync, testConnection, syncData, sendPayments } = useBitrixIntegration();
  const { toast } = useToast();

  const handleTestConnection = async () => {
    if (!config.baseUrl) {
      toast({
        title: "URL obrigatória",
        description: "Configure a URL base do Bitrix24",
        variant: "destructive"
      });
      return;
    }

    const success = await testConnection(config);
    if (success) {
      setConfig(prev => ({ ...prev, enabled: true }));
    }
  };

  const handleSync = async () => {
    await syncData(config);
  };

  const handleSendPayments = async (leadIds: string[], dryRun: boolean = false) => {
    await sendPayments(config, leadIds, dryRun);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência"
    });
  };

  const getStatusBadge = () => {
    if (isConnected) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Conectado</Badge>;
    }
    return <Badge variant="secondary">Desconectado</Badge>;
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-bold">Integração Bitrix24</h2>
          <p className="text-muted-foreground">
            Configure a conexão com seu CRM Bitrix24
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="oauth-helper">Assistente OAuth</TabsTrigger>
          <TabsTrigger value="fields">Mapeamento de Campos</TabsTrigger>
          <TabsTrigger value="help">Guia de Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, enabled }))}
                />
                Ativar integração Bitrix24
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.enabled && (
                <>
                  <div className="space-y-3">
                    <Label>Modo de Autenticação</Label>
                    <RadioGroup
                      value={config.authMode}
                      onValueChange={(value: 'webhook' | 'oauth') => 
                        setConfig(prev => ({ ...prev, authMode: value }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="webhook" id="webhook" />
                        <Label htmlFor="webhook">Webhook (Recomendado)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oauth" id="oauth" />
                        <Label htmlFor="oauth">OAuth</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="baseUrl">URL Base do Bitrix24</Label>
                    <Input
                      id="baseUrl"
                      placeholder="https://sua-empresa.bitrix24.com"
                      value={config.baseUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    />
                  </div>

                  {config.authMode === 'webhook' ? (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="webhookUserId">User ID do Webhook</Label>
                        <Input
                          id="webhookUserId"
                          placeholder="1"
                          value={config.webhookUserId}
                          onChange={(e) => setConfig(prev => ({ ...prev, webhookUserId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="webhookToken">Token do Webhook</Label>
                        <div className="flex gap-2">
                          <Input
                            id="webhookToken"
                            type={showTokens.webhookToken ? "text" : "password"}
                            placeholder="seu_webhook_token"
                            value={config.webhookToken}
                            onChange={(e) => setConfig(prev => ({ ...prev, webhookToken: e.target.value }))}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTokens(prev => ({ ...prev, webhookToken: !prev.webhookToken }))}
                          >
                            {showTokens.webhookToken ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="clientId">Client ID</Label>
                        <Input
                          id="clientId"
                          placeholder="seu_client_id"
                          value={config.clientId}
                          onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="clientSecret">Client Secret</Label>
                        <div className="flex gap-2">
                          <Input
                            id="clientSecret"
                            type={showTokens.clientSecret ? "text" : "password"}
                            placeholder="seu_client_secret"
                            value={config.clientSecret}
                            onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTokens(prev => ({ ...prev, clientSecret: !prev.clientSecret }))}
                          >
                            {showTokens.clientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="refreshToken">Refresh Token</Label>
                        <div className="flex gap-2">
                          <Input
                            id="refreshToken"
                            type={showTokens.refreshToken ? "text" : "password"}
                            placeholder="seu_refresh_token"
                            value={config.refreshToken}
                            onChange={(e) => setConfig(prev => ({ ...prev, refreshToken: e.target.value }))}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTokens(prev => ({ ...prev, refreshToken: !prev.refreshToken }))}
                          >
                            {showTokens.refreshToken ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-3">
                    <Label>Entidades para Integrar</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="leads"
                          checked={config.enabledEntities.leads}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            enabledEntities: { ...prev.enabledEntities, leads: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="leads">Leads</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="projetos"
                          checked={config.enabledEntities.projetos}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            enabledEntities: { ...prev.enabledEntities, projetos: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="projetos">SPA - Projetos Comerciais</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="scouters"
                          checked={config.enabledEntities.scouters}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            enabledEntities: { ...prev.enabledEntities, scouters: e.target.checked }
                          }))}
                          className="rounded"
                        />
                        <Label htmlFor="scouters">SPA - Scouters</Label>
                      </div>
                    </div>
                  </div>

                  {(config.enabledEntities.projetos || config.enabledEntities.scouters) && (
                    <div className="space-y-3">
                      <Label>IDs dos Smart Process Apps (SPA)</Label>
                      {config.enabledEntities.projetos && (
                        <div>
                          <Label htmlFor="projetosId" className="text-sm">ID do SPA - Projetos Comerciais</Label>
                          <Input
                            id="projetosId"
                            placeholder="176"
                            value={config.spaIds.projetos}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              spaIds: { ...prev.spaIds, projetos: e.target.value }
                            }))}
                          />
                        </div>
                      )}
                      {config.enabledEntities.scouters && (
                        <div>
                          <Label htmlFor="scoutersId" className="text-sm">ID do SPA - Scouters</Label>
                          <Input
                            id="scoutersId"
                            placeholder="177"
                            value={config.spaIds.scouters}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              spaIds: { ...prev.spaIds, scouters: e.target.value }
                            }))}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleTestConnection} disabled={isLoading}>
                      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                      Testar Conexão
                    </Button>
                    {isConnected && (
                      <>
                        <Button variant="outline" onClick={handleSync} disabled={isLoading}>
                          Sincronizar Dados
                        </Button>
                        <Button variant="outline" onClick={() => handleSendPayments([], true)}>
                          Simular Baixas
                        </Button>
                      </>
                    )}
                  </div>

                  {lastSync && (
                    <p className="text-sm text-muted-foreground">
                      Última sincronização: {lastSync.toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oauth-helper" className="space-y-4">
          <BitrixOAuthHelper />
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Campos Customizados</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure os códigos dos campos customizados do seu Bitrix24. 
                  Estes códigos podem variar entre diferentes instalações.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Campos para Leads</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Campo Scouter</Label>
                      <Input placeholder="UF_CRM_SCOUTER" />
                    </div>
                    <div>
                      <Label className="text-sm">Campo Projeto</Label>
                      <Input placeholder="UF_CRM_PROJETO" />
                    </div>
                    <div>
                      <Label className="text-sm">Campo Valor da Ficha</Label>
                      <Input placeholder="UF_CRM_VALOR_FICHA" />
                    </div>
                    <div>
                      <Label className="text-sm">Campo Status Pagamento</Label>
                      <Input placeholder="UF_CRM_PAGAMENTO_STATUS" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Campos para SPA - Projetos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Campo Meta de Fichas</Label>
                      <Input placeholder="UF_CRM_META_FICHAS" />
                    </div>
                    <div>
                      <Label className="text-sm">Campo Início Captação</Label>
                      <Input placeholder="UF_CRM_INICIO_CAPTACAO" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guia de Integração Bitrix24</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Configuração de Webhook (Recomendado)</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse seu Bitrix24 como administrador</li>
                  <li>Vá em "Aplicativos" → "Desenvolvedor" → "Outros" → "Webhook de entrada"</li>
                  <li>Clique em "Criar webhook"</li>
                  <li>Selecione as permissões necessárias:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><strong>CRM</strong> - para acessar leads</li>
                      <li><strong>Leitura (crm)</strong> - para ler dados</li>
                      <li><strong>Escrita (crm)</strong> - para atualizar dados</li>
                    </ul>
                  </li>
                  <li>Copie a URL gerada e extraia o User ID e Token</li>
                </ol>
                
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Exemplo de URL do Webhook:</p>
                  <code className="text-xs bg-background p-1 rounded">
                    https://maxsystem.bitrix24.com.br/rest/7/ig7ptt69ey9sbbyl/
                  </code>
                  <p className="text-xs mt-1">User ID = 7, Token = ig7ptt69ey9sbbyl</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Configuração OAuth (Mais Complexa)</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse "Aplicativos" → "Desenvolvedor" → "Criar aplicativo"</li>
                  <li>Escolha "Aplicativo local" para uso interno</li>
                  <li>Configure as permissões necessárias (CRM)</li>
                  <li>Defina a URL de callback: <code className="text-xs bg-muted p-1 rounded">{window.location.origin}/bitrix-callback</code></li>
                  <li>Anote o Client ID e Client Secret gerados</li>
                  <li>Use o <strong>Assistente OAuth</strong> nesta integração para obter o Refresh Token</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Descobrir IDs dos SPAs</h4>
                <p className="text-sm mb-2">Para encontrar os IDs dos Smart Process Apps:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse "CRM" → "Configurações" → "Automação"</li>
                  <li>Encontre seus SPAs de "Projetos Comerciais" e "Scouters"</li>
                  <li>O ID aparece na URL quando você acessa o SPA ou nas configurações</li>
                  <li>Os IDs fornecidos foram: Projetos = 1120, Scouters = 1096</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Problemas Comuns</h4>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>Failed to fetch:</strong> Use webhook ao invés de OAuth inicialmente</li>
                  <li><strong>Non-2xx status:</strong> Verifique URL base (sem barra no final)</li>
                  <li><strong>Unauthorized:</strong> Confirme User ID e Token do webhook</li>
                  <li><strong>CORS errors:</strong> O proxy Edge Function resolve isso automaticamente</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://apidocs.bitrix24.com/api-reference/index.html" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação API
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard("https://apidocs.bitrix24.com/api-reference/index.html")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
