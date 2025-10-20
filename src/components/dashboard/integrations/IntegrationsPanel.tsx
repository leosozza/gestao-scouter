import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Upload, RefreshCw, Settings, FileText, History, Activity } from 'lucide-react';
import { SupabaseIntegration } from './SupabaseIntegration';
import { BulkImportPanel } from '../BulkImportPanel';
import { TabuladorSync } from './TabuladorSync';
import { TabuladorMaxConfigPanel } from './TabuladorMaxConfigPanel';
import { SyncLogsViewer } from './SyncLogsViewer';
import { DiagnosticHistory } from './DiagnosticHistory';
import { HealthCheckDashboard } from './HealthCheckDashboard';

export function IntegrationsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
        <p className="text-muted-foreground">
          Configuração, importação massiva e sincronização com TabuladorMax
        </p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronização
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-2">
            <Activity className="h-4 w-4" />
            Health Check
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Importação CSV
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Database className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-6">
          <TabuladorMaxConfigPanel />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4 mt-6">
          <TabuladorSync />
        </TabsContent>

        <TabsContent value="health" className="space-y-4 mt-6">
          <HealthCheckDashboard />
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          <DiagnosticHistory />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-6">
          <SyncLogsViewer />
        </TabsContent>

        <TabsContent value="import" className="space-y-4 mt-6">
          <BulkImportPanel />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6" />
                <div>
                  <CardTitle>Integração Supabase - TabuladorMax</CardTitle>
                  <CardDescription>
                    Configuração e monitoramento da conexão com banco de dados
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SupabaseIntegration />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
