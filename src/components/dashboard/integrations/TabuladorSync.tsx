import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, Database, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase-helper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SyncStatus {
  id: string;
  project_name: string;
  last_sync_at: string | null;
  last_sync_success: boolean | null;
  total_records: number;
  last_error: string | null;
}

interface SyncLog {
  id: string;
  started_at: string;
  completed_at: string | null;
  sync_direction: string;
  records_synced: number;
  records_failed: number;
  processing_time_ms: number | null;
  errors: any;
}

export function TabuladorSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSyncStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('*')
        .eq('project_name', 'TabuladorMax')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar status:', error);
      } else if (data) {
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Erro ao carregar sync status:', error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao carregar logs:', error);
      } else {
        setSyncLogs(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar sync logs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadSyncStatus(), loadSyncLogs()]);
      setIsLoading(false);
    };

    loadData();

    // Atualizar a cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6" />
              <div>
                <CardTitle>Sincronização TabuladorMax</CardTitle>
                <CardDescription>
                  Este projeto recebe dados via arquitetura PUSH
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={syncStatus?.last_sync_success ? 'default' : 'secondary'}
              className="text-sm"
            >
              {syncStatus?.last_sync_success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Aguardando Dados
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informational Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <div className="space-y-2">
                <p className="font-semibold">Este é um projeto receptor (PUSH)</p>
                <p className="text-sm">
                  O <strong>TabuladorMax</strong> envia dados automaticamente para este projeto via Edge Function <code className="bg-muted px-1 py-0.5 rounded">export-to-gestao-scouter-batch</code>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Para iniciar ou configurar a sincronização, acesse o <strong>painel de Sincronização no TabuladorMax</strong>.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Última Sincronização</div>
              <div className="text-lg font-semibold">
                {syncStatus?.last_sync_at ? (
                  formatDistanceToNow(new Date(syncStatus.last_sync_at), {
                    addSuffix: true,
                    locale: ptBR
                  })
                ) : (
                  'Nunca'
                )}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total de Registros</div>
              <div className="text-lg font-semibold">
                {syncStatus?.total_records?.toLocaleString('pt-BR') || 0}
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="text-lg font-semibold">
                {syncStatus?.last_sync_success === null ? (
                  <span className="text-muted-foreground">Aguardando</span>
                ) : syncStatus?.last_sync_success ? (
                  <span className="text-green-600">Funcionando</span>
                ) : (
                  <span className="text-destructive">Erro</span>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {syncStatus?.last_error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <p className="font-semibold">Último Erro:</p>
                <p className="text-sm mt-1">{syncStatus.last_error}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Verifique as configurações no TabuladorMax
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Sync Logs */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Histórico de Sincronizações</h3>
            {syncLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma sincronização registrada ainda</p>
                <p className="text-sm mt-1">Os dados aparecerão aqui quando o TabuladorMax enviar os primeiros registros</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Direção</TableHead>
                      <TableHead className="text-right">Sincronizados</TableHead>
                      <TableHead className="text-right">Falhas</TableHead>
                      <TableHead className="text-right">Tempo (ms)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {formatDistanceToNow(new Date(log.started_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.sync_direction === 'pull' ? 'TabuladorMax → Gestão' : 
                             log.sync_direction === 'push' ? 'Gestão → TabuladorMax' :
                             log.sync_direction}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(log.records_synced ?? 0).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={(log.records_failed ?? 0) > 0 ? 'text-destructive' : ''}>
                            {(log.records_failed ?? 0).toLocaleString('pt-BR')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {log.processing_time_ms?.toLocaleString('pt-BR') || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Architecture Documentation Link */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="ml-2">
              <p className="text-sm">
                📚 Para mais informações sobre a arquitetura de sincronização, consulte o arquivo{' '}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">SYNC_ARCHITECTURE_GESTAO_SCOUTER.md</code>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
