import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Settings, GitBranch } from 'lucide-react';
import { SupabaseIntegration } from './SupabaseIntegration';
import { FieldMappingConfig } from './FieldMappingConfig';
import { TabuladorMaxInfo } from './TabuladorMaxInfo';

export function IntegrationsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
        <p className="text-muted-foreground">
          Configure a conexão com Supabase e mapeamento de campos
        </p>
      </div>

      <Tabs defaultValue="supabase" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="supabase">
            <Database className="h-4 w-4 mr-2" />
            Supabase
          </TabsTrigger>
          <TabsTrigger value="field-mapping">
            <Settings className="h-4 w-4 mr-2" />
            Mapeamento de Campos
          </TabsTrigger>
          <TabsTrigger value="tabuladormax">
            <GitBranch className="h-4 w-4 mr-2" />
            TabuladorMax
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supabase" className="space-y-4">
          <SupabaseIntegration />
        </TabsContent>

        <TabsContent value="field-mapping" className="space-y-4">
          <FieldMappingConfig />
        </TabsContent>

        <TabsContent value="tabuladormax" className="space-y-4">
          <TabuladorMaxInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
