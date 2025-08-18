
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plug, 
  Database, 
  Workflow, 
  Settings, 
  ExternalLink,
  CheckCircle,
  XCircle,
  Shuffle
} from "lucide-react";
import { BitrixIntegration } from "./BitrixIntegration";
import { N8NIntegration } from "./N8NIntegration";
import { DataSourceSelector } from "./DataSourceSelector";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
}

const availableIntegrations: Integration[] = [
  {
    id: 'bitrix24',
    name: 'Bitrix24',
    description: 'Integração completa com CRM Bitrix24 para Leads e SPAs',
    icon: <Database className="h-6 w-6" />,
    status: 'disconnected',
    enabled: false,
  },
  {
    id: 'n8n',
    name: 'N8N',
    description: 'Automação de workflows e processamento de dados',
    icon: <Workflow className="h-6 w-6" />,
    status: 'disconnected',
    enabled: false,
  },
];

export const IntegrationsPanel = () => {
  const [selectedIntegration, setSelectedIntegration] = useState<string>('data-source');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconectado</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Plug className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte o MaxFama com outros sistemas e configure a fonte de dados
          </p>
        </div>
      </div>

      <Tabs value={selectedIntegration} onValueChange={setSelectedIntegration}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data-source" className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Google Sheets
          </TabsTrigger>
          <TabsTrigger value="bitrix24" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Bitrix24
          </TabsTrigger>
          <TabsTrigger value="n8n" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            N8N
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data-source">
          <DataSourceSelector />
        </TabsContent>

        <TabsContent value="bitrix24">
          <BitrixIntegration />
        </TabsContent>

        <TabsContent value="n8n">
          <N8NIntegration />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integrações Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {availableIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {getStatusIcon(integration.status)}
                      {getStatusBadge(integration.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIntegration(integration.id)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fonte de Dados Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-success/10">
                <div className="flex items-center gap-3">
                  <Shuffle className="h-6 w-6 text-success" />
                  <div>
                    <h4 className="font-medium">Google Sheets</h4>
                    <p className="text-sm text-muted-foreground">
                      Planilhas públicas com dados de fichas e projetos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <Badge className="bg-success/20 text-success border-success/30">Ativo</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIntegration('data-source')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Links Úteis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://apidocs.bitrix24.com/api-reference/index.html" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação Bitrix24 API
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://docs.n8n.io/" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação N8N
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
