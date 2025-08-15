
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plug, 
  Database, 
  Webhook, 
  Settings, 
  ExternalLink,
  CheckCircle,
  XCircle
} from "lucide-react";
import { BitrixIntegration } from "./BitrixIntegration";

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
    id: 'webhook',
    name: 'Webhooks',
    description: 'Receba notificações em tempo real de eventos do sistema',
    icon: <Webhook className="h-6 w-6" />,
    status: 'disconnected',
    enabled: false,
  },
];

export const IntegrationsPanel = () => {
  const [selectedIntegration, setSelectedIntegration] = useState<string>('bitrix24');

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
            Conecte o MaxFama com outros sistemas e serviços
          </p>
        </div>
      </div>

      <Tabs value={selectedIntegration} onValueChange={setSelectedIntegration}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bitrix24" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Bitrix24
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bitrix24">
          <BitrixIntegration />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Configuração de Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Webhooks em Desenvolvimento</h3>
                <p className="text-muted-foreground mb-4">
                  A funcionalidade de webhooks será disponibilizada em breve.
                </p>
                <Button variant="outline" disabled>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Documentação (em breve)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                    disabled={integration.id === 'webhook'}
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
    </div>
  );
};
