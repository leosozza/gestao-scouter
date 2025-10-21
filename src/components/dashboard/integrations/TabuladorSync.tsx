import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle2, XCircle, Clock, Database, AlertCircle, Info, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-helper';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createSyncLog } from '@/repositories/syncLogsRepo';
import { getTabuladorConfig } from '@/repositories/tabuladorConfigRepo';
import { DiagnosticModal } from './DiagnosticModal';
import { TabuladorSetupGuide } from './TabuladorSetupGuide';

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
  const [isMigrating, setIsMigrating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState(false);
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
    const startTime = Date.now();
    
    console.log('🔄 [TabuladorSync] Iniciando sincronização manual...');
    
    toast({
      title: 'Sincronização iniciada',
      description: 'Aguarde enquanto sincronizamos com TabuladorMax...'
    });

    try {
      // Get TabuladorMax config
      const config = await getTabuladorConfig();
      console.log('📋 [TabuladorSync] Configuração carregada:', {
        url: config?.url,
        enabled: config?.enabled,
      });

      const endpoint = `${supabase.supabaseUrl}/functions/v1/sync-tabulador`;
      console.log('📡 [TabuladorSync] Endpoint:', endpoint);
      console.log('🎯 [TabuladorSync] Tabela: leads (TabuladorMax) ↔ leads (Gestão Scouter)');
      
      const { data, error } = await supabase.functions.invoke('sync-tabulador', {
        body: { manual: true }
      });

      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error('❌ [TabuladorSync] Erro na sincronização:', error);
        
        // Log error
        await createSyncLog({
          endpoint,
          table_name: 'leads <-> leads',
          status: 'error',
          error_message: error.message,
          execution_time_ms: executionTime,
        });
        
        throw error;
      }

      console.log('✅ [TabuladorSync] Sincronização concluída:', data);
      console.log(`📊 [TabuladorSync] Enviados: ${data?.gestao_to_tabulador || 0}`);
      console.log(`📥 [TabuladorSync] Recebidos: ${data?.tabulador_to_gestao || 0}`);
      console.log(`⏱️ [TabuladorSync] Tempo: ${executionTime}ms`);

      // Log success
      await createSyncLog({
        endpoint,
        table_name: 'leads <-> leads',
        status: 'success',
        records_count: (data?.gestao_to_tabulador || 0) + (data?.tabulador_to_gestao || 0),
        execution_time_ms: executionTime,
        response_data: data,
      });

      toast({
        title: 'Sincronização concluída',
        description: `${data?.gestao_to_tabulador || 0} enviados, ${data?.tabulador_to_gestao || 0} recebidos`
      });

      // Recarregar status e logs
      await loadSyncStatus();
      await loadSyncLogs();
    } catch (error) {
      console.error('❌ [TabuladorSync] Exceção na sincronização:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const testConnection = async () => {
    const startTime = Date.now();
    
    console.log('🧪 [TabuladorSync] Testando conexão com TabuladorMax...');
    
    toast({
      title: 'Testando conexão',
      description: 'Verificando conectividade com TabuladorMax...'
    });

    try {
      // Get TabuladorMax config
      const config = await getTabuladorConfig();
      console.log('📋 [TabuladorSync] Usando configuração:', {
        url: config?.url,
        projectId: config?.project_id,
      });

      const endpoint = `${supabase.supabaseUrl}/functions/v1/test-tabulador-connection`;
      console.log('📡 [TabuladorSync] Endpoint de teste:', endpoint);
      console.log('🎯 [TabuladorSync] Tabela alvo: leads');
      
      const { data, error } = await supabase.functions.invoke('test-tabulador-connection');

      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error('❌ [TabuladorSync] Erro no teste:', error);
        
        // Log error
        await createSyncLog({
          endpoint,
          table_name: 'leads (teste)',
          status: 'error',
          error_message: error.message,
          execution_time_ms: executionTime,
        });
        
        throw error;
      }

      // Mostrar resultado detalhado
      const leadsInfo = data.tables?.leads;
      console.log('📊 [TabuladorSync] Resultado do teste:', {
        status: leadsInfo?.status,
        total: leadsInfo?.total_count,
        hint: leadsInfo?.hint,
      });

      if (leadsInfo?.status?.includes('✅')) {
        // Log success
        await createSyncLog({
          endpoint,
          table_name: 'leads (teste)',
          status: 'success',
          records_count: leadsInfo.total_count || 0,
          execution_time_ms: executionTime,
          response_data: data,
        });

        toast({
          title: '✅ Conexão bem-sucedida!',
          description: `${leadsInfo.total_count || 0} leads encontrados no TabuladorMax via Edge Function.`
        });
      } else {
        // Log warning/error
        await createSyncLog({
          endpoint,
          table_name: 'leads (teste)',
          status: 'error',
          error_message: leadsInfo?.error || 'Problema na conexão',
          execution_time_ms: executionTime,
          response_data: data,
        });

        const errorMsg = leadsInfo?.error || 'Problema na conexão';
        const hintMsg = leadsInfo?.hint || 'Verifique se as Edge Functions estão deployadas no TabuladorMax';

        toast({
          title: '❌ Problema na conexão',
          description: (
            <div className="space-y-2">
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-xs text-muted-foreground">{hintMsg}</p>
            </div>
          ),
          variant: 'destructive'
        });
      }

      console.log('📊 [TabuladorSync] Diagnóstico completo:', data);
    } catch (error) {
      console.error('❌ [TabuladorSync] Exceção no teste:', error);
      toast({
        title: 'Erro ao testar conexão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const runDiagnostic = async () => {
    const startTime = Date.now();
    
    console.log('🔍 [TabuladorSync] Executando diagnóstico completo...');
    
    toast({
      title: 'Diagnóstico Iniciado',
      description: 'Executando verificações de configuração e conectividade...'
    });

    try {
      const endpoint = `${supabase.supabaseUrl}/functions/v1/diagnose-tabulador-sync`;
      console.log('📡 [TabuladorSync] Endpoint de diagnóstico:', endpoint);
      
      const { data, error } = await supabase.functions.invoke('diagnose-tabulador-sync');

      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error('❌ [TabuladorSync] Erro no diagnóstico:', error);
        
        await createSyncLog({
          endpoint,
          table_name: 'diagnostic',
          status: 'error',
          error_message: error.message,
          execution_time_ms: executionTime,
        });
        
        throw error;
      }

      console.log('📊 [TabuladorSync] Resultado do diagnóstico:', data);

      // Log result
      await createSyncLog({
        endpoint,
        table_name: 'diagnostic',
        status: data.overall_status === 'ok' ? 'success' : 'error',
        execution_time_ms: executionTime,
        response_data: data,
      });

      // Store result and open modal
      setDiagnosticResult(data);
      setDiagnosticModalOpen(true);

      // Show result
      if (data.overall_status === 'ok') {
        toast({
          title: '✅ Diagnóstico Completo',
          description: 'Todos os testes passaram! Clique para ver detalhes.'
        });
      } else if (data.overall_status === 'warning') {
        toast({
          title: '⚠️ Diagnóstico com Avisos',
          description: `${data.errors.length} aviso(s) encontrado(s). Verifique os logs para detalhes.`,
          variant: 'default'
        });
      } else {
        toast({
          title: '❌ Problemas Detectados',
          description: `${data.errors.length} erro(s) encontrado(s). ${data.recommendations[0] || 'Verifique os logs'}`,
          variant: 'destructive'
        });
      }

      console.log('📋 [TabuladorSync] Recomendações:', data.recommendations);
      console.log('❌ [TabuladorSync] Erros:', data.errors);
    } catch (error) {
      console.error('❌ [TabuladorSync] Exceção no diagnóstico:', error);
      toast({
        title: 'Erro no diagnóstico',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  };

  const triggerInitialMigration = async () => {
    setIsMigrating(true);
    const startTime = Date.now();
    
    console.log('🚀 [TabuladorSync] Iniciando migração inicial...');
    
    toast({
      title: 'Migração inicial iniciada',
      description: 'Buscando todos os leads do TabuladorMax...'
    });

    try {
      // Get TabuladorMax config
      const config = await getTabuladorConfig();
      console.log('📋 [TabuladorSync] Configuração carregada:', {
        url: config?.url,
        projectId: config?.project_id,
      });

      const endpoint = `${supabase.supabaseUrl}/functions/v1/initial-sync-leads`;
      console.log('📡 [TabuladorSync] Endpoint:', endpoint);
      console.log('🎯 [TabuladorSync] Tabela origem: leads (TabuladorMax)');
      console.log('🎯 [TabuladorSync] Tabela destino: leads (Gestão Scouter)');
      console.log('📥 [TabuladorSync] Buscando TODOS os leads do TabuladorMax...');
      
      const { data, error } = await supabase.functions.invoke('initial-sync-leads', {
        body: { manual: true }
      });

      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error('❌ [TabuladorSync] Erro na migração:', error);
        
        // Log error
        await createSyncLog({
          endpoint,
          table_name: 'leads → leads (migração)',
          status: 'error',
          error_message: error.message,
          execution_time_ms: executionTime,
        });
        
        throw error;
      }

      console.log('✅ [TabuladorSync] Migração concluída:', data);
      console.log(`📊 [TabuladorSync] Total de leads: ${data?.total_leads || 0}`);
      console.log(`✅ [TabuladorSync] Migrados: ${data?.migrated || 0}`);
      console.log(`❌ [TabuladorSync] Falharam: ${data?.failed || 0}`);
      console.log(`⏱️ [TabuladorSync] Tempo: ${executionTime}ms`);

      if (data.success) {
        // Log success
        await createSyncLog({
          endpoint,
          table_name: 'leads → leads (migração)',
          status: 'success',
          records_count: data.migrated,
          execution_time_ms: executionTime,
          response_data: data,
        });

        toast({
          title: 'Migração concluída com sucesso!',
          description: `${data.migrated} leads migrados de ${data.total_leads} encontrados`
        });
      } else {
        // Log partial success
        await createSyncLog({
          endpoint,
          table_name: 'leads → leads (migração)',
          status: data.failed > 0 ? 'error' : 'success',
          records_count: data.migrated,
          error_message: data.errors?.join('; '),
          execution_time_ms: executionTime,
          response_data: data,
        });

        toast({
          title: 'Migração parcialmente concluída',
          description: `${data.migrated} migrados, ${data.failed} falharam`,
          variant: 'default'
        });
      }

      // Recarregar status e logs
      await loadSyncStatus();
      await loadSyncLogs();
    } catch (error) {
      console.error('❌ [TabuladorSync] Exceção na migração:', error);
      toast({
        title: 'Erro na migração inicial',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsMigrating(false);
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
      {/* Main Card with Tabs */}
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
            <Badge 
              variant={syncStatus?.last_sync_success ? 'default' : 'destructive'}
              className="text-sm"
            >
              {syncStatus?.last_sync_success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Erro na Configuração
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={syncStatus?.last_sync_success === false ? 'setup' : 'sync'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sync">
                <Database className="h-4 w-4 mr-2" />
                Sincronização
              </TabsTrigger>
              <TabsTrigger value="setup">
                <Settings className="h-4 w-4 mr-2" />
                Configuração
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-6 mt-6">
              {/* Status Section */}
              <Card className="border-0 shadow-none">
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Status da Sincronização</CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        onClick={runDiagnostic} 
                        disabled={isMigrating || isSyncing}
                        size="sm"
                        variant="outline"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Diagnóstico
                      </Button>
                      <Button 
                        onClick={testConnection} 
                        disabled={isMigrating || isSyncing}
                        size="sm"
                        variant="outline"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Testar
                      </Button>
                      <Button 
                        onClick={triggerSync} 
                        disabled={isSyncing || isMigrating}
                        size="sm"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sincronizar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
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
                {(syncStatus?.total_records ?? 0).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Projeto</p>
              <p className="text-sm font-medium">TabuladorMax</p>
            </div>
          </div>

          {syncStatus?.last_error && (
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">Último Erro:</p>
                  <p className="text-xs text-destructive/80 font-mono mt-1 break-all">
                    {syncStatus.last_error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-base">Histórico de Sincronizações</CardTitle>
          <CardDescription>Últimas 10 sincronizações executadas</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
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
                        {(log.records_synced ?? 0).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {(log.records_failed ?? 0) > 0 ? (
                          <span className="text-destructive font-medium">
                            {(log.records_failed ?? 0).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          (log.records_failed ?? 0).toLocaleString('pt-BR')
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.processing_time_ms != null ? log.processing_time_ms.toLocaleString('pt-BR') : '-'}
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
    </TabsContent>

    <TabsContent value="setup" className="mt-6">
      <TabuladorSetupGuide />
    </TabsContent>
  </Tabs>
        </CardContent>
      </Card>

      {/* Diagnostic Modal */}
      <DiagnosticModal
        open={diagnosticModalOpen}
        onOpenChange={setDiagnosticModalOpen}
        result={diagnosticResult}
      />
    </div>
  );
}
