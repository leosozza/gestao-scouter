
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
  Workflow, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface N8NConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
  workflows: {
    leads: string;
    projetos: string;
    payments: string;
  };
}

export const N8NIntegration = () => {
  const [config, setConfig] = useState<N8NConfig>({
    enabled: false,
    baseUrl: '',
    apiKey: '',
    webhookUrl: '',
    workflows: {
      leads: '',
      projetos: '',
      payments: '',
    },
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTestConnection = async () => {
    if (!config.baseUrl || !config.apiKey) {
      toast({
        title: "Dados obrigatórios",
        description: "Configure a URL base e a API Key do N8N",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simular teste de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsConnected(true);
      setConfig(prev => ({ ...prev, enabled: true }));
      toast({
        title: "Conexão bem-sucedida",
        description: "N8N conectado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro na conexão",
        description: "Verifique as credenciais do N8N",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
        <Workflow className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-bold">Integração N8N</h2>
          <p className="text-muted-foreground">
            Configure a automação com N8N para processar dados
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
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
                Ativar integração N8N
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.enabled && (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="n8nBaseUrl">URL Base do N8N</Label>
                    <Input
                      id="n8nBaseUrl"
                      placeholder="https://seu-n8n.exemplo.com"
                      value={config.baseUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="n8nApiKey">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="n8nApiKey"
                        type={showApiKey ? "text" : "password"}
                        placeholder="sua_api_key_n8n"
                        value={config.apiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="webhookUrl">URL do Webhook (Opcional)</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://seu-n8n.exemplo.com/webhook/maxfama"
                      value={config.webhookUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL para receber dados do MaxFama nos workflows do N8N
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleTestConnection} disabled={isLoading}>
                      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                      Testar Conexão
                    </Button>
                    {isConnected && (
                      <Button variant="outline" disabled>
                        Executar Workflows
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Workflows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure os IDs dos workflows do N8N para diferentes tipos de dados
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="leadsWorkflow">Workflow ID - Processar Leads</Label>
                  <Input
                    id="leadsWorkflow"
                    placeholder="workflow_id_leads"
                    value={config.workflows.leads}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      workflows: { ...prev.workflows, leads: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="projetosWorkflow">Workflow ID - Processar Projetos</Label>
                  <Input
                    id="projetosWorkflow"
                    placeholder="workflow_id_projetos"
                    value={config.workflows.projetos}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      workflows: { ...prev.workflows, projetos: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="paymentsWorkflow">Workflow ID - Processar Pagamentos</Label>
                  <Input
                    id="paymentsWorkflow"
                    placeholder="workflow_id_pagamentos"
                    value={config.workflows.payments}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      workflows: { ...prev.workflows, payments: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guia de Integração N8N</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Configuração da API Key</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse seu N8N como administrador</li>
                  <li>Vá em "Settings" → "API Keys"</li>
                  <li>Crie uma nova API Key com as permissões necessárias</li>
                  <li>Copie a chave gerada</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Criar Workflows</h4>
                <p className="text-sm mb-2">Crie workflows no N8N para processar os dados do MaxFama:</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>Workflow de Leads:</strong> Processa dados de leads importados</li>
                  <li><strong>Workflow de Projetos:</strong> Processa informações de projetos</li>
                  <li><strong>Workflow de Pagamentos:</strong> Processa baixas de pagamento</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Configurar Webhook (Opcional)</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>No N8N, crie um workflow com trigger "Webhook"</li>
                  <li>Configure o método HTTP como POST</li>
                  <li>Copie a URL do webhook gerada</li>
                  <li>Cole a URL no campo "URL do Webhook" acima</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Estrutura dos Dados</h4>
                <p className="text-sm mb-2">O MaxFama enviará dados no seguinte formato:</p>
                <div className="bg-muted p-3 rounded-lg">
                  <code className="text-xs">
                    {`{
  "type": "leads|projetos|pagamentos",
  "data": [...],
  "timestamp": "2024-01-01T00:00:00Z",
  "source": "maxfama"
}`}
                  </code>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://docs.n8n.io/" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação N8N
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard("https://docs.n8n.io/")}
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
