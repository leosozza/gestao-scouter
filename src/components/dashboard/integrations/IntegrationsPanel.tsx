import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { SupabaseIntegration } from './SupabaseIntegration';

export function IntegrationsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
        <p className="text-muted-foreground">
          Configuração e monitoramento da conexão com Supabase - TabuladorMax
        </p>
      </div>

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
    </div>
  );
}
