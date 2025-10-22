import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEFAULT_FICHAS_MAPPINGS } from '@/config/fieldMappings';

interface WizardStep {
  step: 'upload' | 'mapping' | 'processing';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  headers?: string[];
  sampleData?: string[][];
  jobId?: string;
}

interface ImportJob {
  id: string;
  status: string;
  total_rows: number | null;
  processed_rows: number;
  inserted_rows: number;
  failed_rows: number;
  error_message: string | null;
}

interface CsvImportWizardProps {
  open: boolean;
  onClose: () => void;
}

export function CsvImportWizard({ open, onClose }: CsvImportWizardProps) {
  const [wizardState, setWizardState] = useState<WizardStep>({ step: 'upload' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 1: Upload para Storage
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      toast.info('Enviando arquivo para o storage...');
      
      const { error: uploadError } = await supabase.storage
        .from('csv-imports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      toast.info('Analisando cabeçalhos do CSV...');

      // Obter cabeçalhos
      const { data: headersData, error: headersError } = await supabase.functions.invoke('parse-csv-headers', {
        body: { file_path: filePath }
      });

      if (headersError || !headersData?.success) {
        throw new Error(headersData?.error || 'Erro ao analisar cabeçalhos');
      }

      // Auto-mapear colunas usando DEFAULT_FICHAS_MAPPINGS
      const autoMapping: Record<string, string> = {};
      headersData.headers.forEach((csvHeader: string) => {
        const normalizedHeader = csvHeader.toLowerCase().trim();
        const match = DEFAULT_FICHAS_MAPPINGS.find(mapping => 
          mapping.legacyAliases.some(alias => alias.toLowerCase() === normalizedHeader)
        );
        if (match) {
          autoMapping[csvHeader] = match.supabaseField;
        }
      });

      setColumnMapping(autoMapping);
      setWizardState({ 
        step: 'mapping',
        fileUrl: filePath,
        fileName: file.name,
        fileSize: file.size,
        headers: headersData.headers,
        sampleData: headersData.sampleData
      });

      toast.success('Arquivo enviado! Configure o mapeamento de colunas.');
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error.message || 'Erro ao enviar arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 2: Confirmar Mapeamento e Iniciar Processamento
  const handleMappingConfirm = async () => {
    try {
      setIsProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validar que pelo menos uma coluna foi mapeada
      const mappedColumns = Object.values(columnMapping).filter(v => v);
      if (mappedColumns.length === 0) {
        toast.error('Mapeie pelo menos uma coluna antes de continuar');
        return;
      }

      toast.info('Criando job de importação...');

      // Criar job
      const { data: newJob, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          user_id: user.id,
          file_path: wizardState.fileUrl,
          file_name: wizardState.fileName,
          file_size: wizardState.fileSize,
          column_mapping: columnMapping,
          target_table: 'leads',
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      toast.info('Iniciando processamento em background...');

      // Iniciar processamento
      const { error: processError } = await supabase.functions.invoke('process-csv-import', {
        body: { job_id: newJob.id }
      });

      if (processError) throw processError;

      setJob(newJob as ImportJob);
      setWizardState({ ...wizardState, step: 'processing', jobId: newJob.id });
      toast.success('Importação iniciada! Acompanhe o progresso abaixo.');
    } catch (error: any) {
      console.error('Erro ao iniciar importação:', error);
      toast.error(error.message || 'Erro ao iniciar importação');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3: Polling de Progresso
  useEffect(() => {
    if (!wizardState.jobId) return;

    const interval = setInterval(async () => {
      const { data: updatedJob } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', wizardState.jobId)
        .single();

      if (updatedJob) {
        setJob(updatedJob as ImportJob);

        if (updatedJob.status === 'completed') {
          clearInterval(interval);
          toast.success(`Importação concluída! ${updatedJob.inserted_rows} leads inseridos.`);
        } else if (updatedJob.status === 'failed') {
          clearInterval(interval);
          toast.error(`Importação falhou: ${updatedJob.error_message}`);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [wizardState.jobId]);

  const handleClose = () => {
    setWizardState({ step: 'upload' });
    setUploadProgress(0);
    setJob(null);
    setColumnMapping({});
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importação em Lote de Leads
          </DialogTitle>
          <DialogDescription>
            {wizardState.step === 'upload' && 'Envie um arquivo CSV com até 250MB'}
            {wizardState.step === 'mapping' && 'Configure o mapeamento de colunas'}
            {wizardState.step === 'processing' && 'Acompanhe o progresso da importação'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {wizardState.step === 'upload' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Upload className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-lg font-medium">Arraste seu arquivo CSV aqui</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ou clique para selecionar (até 250MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="csv-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild disabled={isProcessing}>
                      <span>
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>Selecionar Arquivo</>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Mapeamento */}
        {wizardState.step === 'mapping' && wizardState.headers && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{wizardState.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {(wizardState.fileSize! / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Badge>{wizardState.headers.length} colunas</Badge>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coluna CSV</TableHead>
                      <TableHead>Amostra</TableHead>
                      <TableHead>→</TableHead>
                      <TableHead>Campo no Banco</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wizardState.headers.map((header, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{header}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {wizardState.sampleData?.[0]?.[idx]?.substring(0, 30) || '-'}
                        </TableCell>
                        <TableCell>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={columnMapping[header] || ''}
                            onValueChange={(value) => {
                              setColumnMapping(prev => ({
                                ...prev,
                                [header]: value
                              }));
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Ignorar coluna" />
                            </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="">Ignorar</SelectItem>
                              {DEFAULT_FICHAS_MAPPINGS.map((mapping) => (
                                <SelectItem key={mapping.supabaseField} value={mapping.supabaseField}>
                                  {mapping.supabaseField}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleMappingConfirm} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>Iniciar Importação</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processamento */}
        {wizardState.step === 'processing' && job && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {job.status === 'completed' && <CheckCircle className="h-5 w-5 text-success" />}
                    {job.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                    {job.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
                    <span className="font-medium capitalize">{job.status}</span>
                  </div>
                  <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                    {job.inserted_rows} / {job.total_rows || '?'} inseridos
                  </Badge>
                </div>

                {job.total_rows && job.total_rows > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progresso</span>
                      <span>{Math.round((job.processed_rows / job.total_rows) * 100)}%</span>
                    </div>
                    <Progress value={(job.processed_rows / job.total_rows) * 100} />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Processados</p>
                    <p className="text-lg font-medium">{job.processed_rows.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Inseridos</p>
                    <p className="text-lg font-medium text-success">{job.inserted_rows.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Falharam</p>
                    <p className="text-lg font-medium text-destructive">{job.failed_rows.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                {job.error_message && (
                  <div className="bg-destructive/10 p-3 rounded text-sm">
                    <p className="font-medium text-destructive">Erro:</p>
                    <p className="text-destructive/80 mt-1">{job.error_message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={handleClose}
                disabled={job.status === 'processing'}
              >
                {job.status === 'processing' ? 'Processando...' : 'Fechar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
