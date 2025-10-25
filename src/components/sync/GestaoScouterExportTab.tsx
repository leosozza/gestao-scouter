import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Database,
  RefreshCw,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-helper';

/**
 * GestaoScouterExportTab Component
 * 
 * Interface de sincronização para exportar dados para o Gestão Scouter via TabuladorMax.
 * 
 * **Funcionalidades:**
 * - Validar schema da tabela leads
 * - Recarregar cache do PostgREST
 * - Testar conexão com Gestão Scouter
 * - Iniciar exportação em lote com controle de progresso
 * - Pausar/Retomar/Resetar exportação
 * - Log de erros detalhado
 * 
 * **Edge Functions Esperadas (no TabuladorMax):**
 * - `/functions/validate-gestao-scouter-schema` - Valida compatibilidade de schema
 * - `/functions/reload-gestao-scouter-schema-cache` - Força reload do cache PostgREST
 * - `/functions/export-to-gestao-scouter-batch` - Exporta leads em lotes
 * 
 * **Secrets Necessários (no TabuladorMax):**
 * - `GESTAO_URL` - URL do projeto Gestão Scouter (ex: https://jstsrgyxrrlklnzgsihd.supabase.co)
 * - `GESTAO_SERVICE_KEY` - Service Role Key do Gestão Scouter (não a Anon Key!)
 * 
 * **Arquitetura:**
 * - TabuladorMax (origem) → Gestão Scouter (destino)
 * - Fluxo PUSH unidirecional
 * - Processamento em lotes de 50 registros
 * - UPSERT com `Prefer: resolution=merge-duplicates`
 */

interface ExportProgress {
  total: number;
  sent: number;
  failed: number;
  current_batch: number;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export function GestaoScouterExportTab() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isReloadingCache, setIsReloadingCache] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    current_batch: 0
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { toast } = useToast();

  const addLog = (type: LogEntry['type'], message: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      type,
      message
    };
    setLogs(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  const handleValidateSchema = async () => {
    setIsValidating(true);
    addLog('info', 'Iniciando validação de schema...');

    try {
      const { data, error } = await supabase.functions.invoke('validate-gestao-scouter-schema');

      if (error) {
        throw error;
      }

      if (data?.valid) {
        toast({
          title: 'Schema Válido',
          description: 'O schema está compatível entre TabuladorMax e Gestão Scouter',
        });
        addLog('success', 'Schema validado com sucesso!');
      } else if (data?.missingColumns && data.missingColumns.length > 0) {
        toast({
          title: 'Schema Incompatível',
          description: `${data.missingColumns.length} colunas faltando no Gestão Scouter`,
          variant: 'destructive'
        });
        addLog('warning', `Colunas faltantes: ${data.missingColumns.join(', ')}`);
        if (data.sql) {
          addLog('info', 'SQL para corrigir disponível no response');
        }
      }
    } catch (error) {
      console.error('Erro ao validar schema:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro na Validação',
        description: errorMessage,
        variant: 'destructive'
      });
      addLog('error', `Erro: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleReloadCache = async () => {
    setIsReloadingCache(true);
    addLog('info', 'Recarregando cache do PostgREST...');

    try {
      const { data, error } = await supabase.functions.invoke('reload-gestao-scouter-schema-cache');

      if (error) {
        throw error;
      }

      toast({
        title: 'Cache Recarregado',
        description: 'O cache do schema foi atualizado com sucesso',
      });
      addLog('success', 'Cache recarregado com sucesso!');
    } catch (error) {
      console.error('Erro ao recarregar cache:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao Recarregar Cache',
        description: errorMessage,
        variant: 'destructive'
      });
      addLog('error', `Erro: ${errorMessage}`);
    } finally {
      setIsReloadingCache(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    addLog('info', 'Testando conexão com Gestão Scouter...');

    try {
      // Test connection by invoking a simple validation or using the validate function
      const { data, error } = await supabase.functions.invoke('validate-gestao-scouter-schema');

      if (error) {
        throw error;
      }

      toast({
        title: 'Conexão Estabelecida',
        description: 'Conexão com Gestão Scouter OK',
      });
      addLog('success', 'Conexão testada com sucesso!');
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro na Conexão',
        description: errorMessage,
        variant: 'destructive'
      });
      addLog('error', `Erro de conexão: ${errorMessage}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleStartExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Datas Obrigatórias',
        description: 'Informe as datas de início e fim para a exportação',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    setIsPaused(false);
    setProgress({ total: 0, sent: 0, failed: 0, current_batch: 0 });
    addLog('info', `Iniciando exportação: ${startDate} até ${endDate}`);

    try {
      const { data, error } = await supabase.functions.invoke('export-to-gestao-scouter-batch', {
        body: {
          startDate,
          endDate
        }
      });

      if (error) {
        throw error;
      }

      // Update progress from response
      if (data) {
        setProgress({
          total: data.total || 0,
          sent: data.succeeded || 0,
          failed: data.failed || 0,
          current_batch: data.batches || 0
        });

        toast({
          title: 'Exportação Concluída',
          description: `${data.succeeded || 0} registros enviados, ${data.failed || 0} falhas`,
        });
        addLog('success', `Exportação concluída: ${data.succeeded || 0} enviados, ${data.failed || 0} falhas`);
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro na Exportação',
        description: errorMessage,
        variant: 'destructive'
      });
      addLog('error', `Erro na exportação: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    addLog('info', isPaused ? 'Exportação retomada' : 'Exportação pausada');
    toast({
      title: isPaused ? 'Exportação Retomada' : 'Exportação Pausada',
      description: isPaused ? 'Processamento retomado' : 'Processamento pausado'
    });
  };

  const handleReset = () => {
    setProgress({ total: 0, sent: 0, failed: 0, current_batch: 0 });
    setLogs([]);
    setIsPaused(false);
    setIsExporting(false);
    addLog('info', 'Estado resetado');
    toast({
      title: 'Reset Completo',
      description: 'Progresso e logs foram limpos'
    });
  };

  const progressPercentage = progress.total > 0 
    ? Math.round(((progress.sent + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronização Gestão Scouter
          </CardTitle>
          <CardDescription>
            Interface de exportação para sincronizar dados do TabuladorMax para o Gestão Scouter.
            <br />
            <strong>Arquitetura:</strong> PUSH Unidirecional (TabuladorMax → Gestão Scouter)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Ações de Configuração</CardTitle>
          <CardDescription>
            Execute estas ações para validar a configuração antes de iniciar a exportação
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={handleTestConnection}
            disabled={isTestingConnection || isExporting}
            variant="outline"
          >
            <Activity className={`h-4 w-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
            Testar Conexão
          </Button>
          
          <Button
            onClick={handleValidateSchema}
            disabled={isValidating || isExporting}
            variant="outline"
          >
            <CheckCircle2 className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Validar Schema
          </Button>
          
          <Button
            onClick={handleReloadCache}
            disabled={isReloadingCache || isExporting}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isReloadingCache ? 'animate-spin' : ''}`} />
            Recarregar Cache
          </Button>
        </CardContent>
      </Card>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Exportação</CardTitle>
          <CardDescription>
            Selecione o período para exportar os leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Início</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isExporting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Fim</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isExporting}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleStartExport}
              disabled={isExporting || !startDate || !endDate}
              className="bg-green-600 hover:bg-green-700"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Exportação
            </Button>
            
            {isExporting && (
              <Button
                onClick={handlePauseResume}
                variant="outline"
              >
                {isPaused ? (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Retomar
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={handleReset}
              disabled={isExporting}
              variant="destructive"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {(progress.total > 0 || isExporting) && (
        <Card>
          <CardHeader>
            <CardTitle>Progresso da Exportação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{progress.total.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold text-green-600">{progress.sent.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Com Erro</p>
                <p className="text-2xl font-bold text-red-600">{progress.failed.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lotes</p>
                <p className="text-2xl font-bold">{progress.current_batch}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Section */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Atividades</CardTitle>
          <CardDescription>
            Últimas 100 mensagens de log
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma atividade registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    log.type === 'error' ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' :
                    log.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' :
                    log.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800' :
                    'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {log.type === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
                  {log.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />}
                  {log.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />}
                  {log.type === 'info' && <Activity className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {log.timestamp}
                      </Badge>
                    </div>
                    <p className="mt-1 break-words">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation Footer */}
      <Card className="bg-gray-50/50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">📚 Documentação:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Secrets necessários no TabuladorMax: <code>GESTAO_URL</code>, <code>GESTAO_SERVICE_KEY</code></li>
              <li>Edge Functions esperadas: <code>validate-gestao-scouter-schema</code>, <code>reload-gestao-scouter-schema-cache</code>, <code>export-to-gestao-scouter-batch</code></li>
              <li>Consulte <code>PROMPT_TABULADORMAX.md</code> para informações completas sobre a arquitetura</li>
              <li>O Gestão Scouter precisa ter RLS policy <code>service_role_upsert_leads</code> configurada</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
