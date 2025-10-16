import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, Clock, Database, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-helper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

  const triggerSync = async () => {
    setIsSyncing(true);
    toast({
      title: 'Sincronização iniciada',
      description: 'Aguarde enquanto sincronizamos com TabuladorMax...'
    });

    try {
      const { data, error } = await supabase.functions.invoke('sync-tabulador', {
        body: { manual: true }
      });

      if (error) throw error;

      toast({
        title: 'Sincronização concluída',
        description: `${data?.result?.records_synced || 0} registros sincronizados`
      });

      // Recarregar status e logs
      await loadSyncStatus();
      await loadSyncLogs();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
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
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6" />
              <div>
                <CardTitle>Sincronização TabuladorMax</CardTitle>
                <CardDescription>
                  Sincronização bidirecional automática a cada 5 minutos
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={triggerSync} 
              disabled={isSyncing}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar Agora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                {syncStatus?.last_sync_success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <Badge variant="outline" className="text-success border-success">
                      Ativo
                    </Badge>
                  </>
                ) : syncStatus?.last_sync_success === false ? (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <Badge variant="outline" className="text-destructive border-destructive">
                      Erro
                    </Badge>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">Aguardando</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Última Sincronização</p>
              <p className="text-sm font-medium">
                {syncStatus?.last_sync_at
                  ? formatDistanceToNow(new Date(syncStatus.last_sync_at), {
                      addSuffix: true,
                      locale: ptBR
                    })
                  : 'Nunca'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Registros</p>
              <p className="text-sm font-medium">
                {syncStatus?.total_records?.toLocaleString('pt-BR') || 0}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Projeto</p>
              <p className="text-sm font-medium">TabuladorMax</p>
            </div>
          </div>

          {syncStatus?.last_error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Último Erro:</p>
                <p className="text-sm text-destructive/80">{syncStatus.last_error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sincronizações</CardTitle>
          <CardDescription>Últimas 10 sincronizações executadas</CardDescription>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma sincronização registrada ainda</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead className="text-right">Sincronizados</TableHead>
                    <TableHead className="text-right">Falhas</TableHead>
                    <TableHead className="text-right">Tempo (ms)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.started_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.sync_direction}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.records_synced.toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.records_failed > 0 ? (
                          <span className="text-destructive font-medium">
                            {log.records_failed}
                          </span>
                        ) : (
                          log.records_failed
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.processing_time_ms?.toLocaleString('pt-BR') || '-'}
                      </TableCell>
                      <TableCell>
                        {log.completed_at ? (
                          log.records_failed === 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-warning" />
                          )
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
