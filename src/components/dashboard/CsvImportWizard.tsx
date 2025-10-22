import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_FICHAS_MAPPINGS, FieldMapping } from '@/config/fieldMappings';
import { ColumnMappingDragDrop } from './ColumnMappingDragDrop';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColumnMappingWithPriority } from '@/hooks/useColumnMapping';

interface WizardStep {
  step: 'upload' | 'mapping' | 'processing';
  csvHeaders: string[];
  sampleData: string[][];
  columnMapping: ColumnMappingWithPriority;
  fileName?: string;
  fileSize?: number;
  file?: File;
}

interface ImportJob {
  id: string;
  file_name: string;
  status: string;
  total_rows: number | null;
  processed_rows: number;
  inserted_rows: number;
  failed_rows: number;
  error_message: string | null;
  errors?: any;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface CsvImportWizardProps {
  open: boolean;
  onClose: () => void;
}

export function CsvImportWizard({ open, onClose }: CsvImportWizardProps) {
  const [wizardState, setWizardState] = useState<WizardStep>({
    step: 'upload',
    csvHeaders: [],
    sampleData: [],
    columnMapping: {},
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingImport, setProcessingImport] = useState(false);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [existingJob, setExistingJob] = useState<ImportJob | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Check for existing pending/processing jobs on mount
  useEffect(() => {
    if (!open) return;

    const checkExistingJobs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('import_jobs')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          // Check if job is stalled (no update in last 5 minutes)
          const lastUpdate = new Date(data.started_at || data.created_at).getTime();
          const now = Date.now();
          const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60;

          if (minutesSinceUpdate > 5 && data.status === 'processing') {
            toast.warning('Detectada importação travada. Você pode cancelá-la e tentar novamente.');
          }

          setExistingJob(data as any);
          setImportJob(data as any);
          setWizardState(prev => ({ ...prev, step: 'processing' }));
        }
      } catch (error) {
        console.error('Erro ao verificar jobs existentes:', error);
      }
    };

    checkExistingJobs();
  }, [open]);

  // Poll job status with stall detection
  useEffect(() => {
    if (!importJob || importJob.status === 'completed' || importJob.status === 'failed') {
      return;
    }

    let lastProcessedRows = importJob.processed_rows;
    let stallCount = 0;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', importJob.id)
        .maybeSingle();

      if (data) {
        setImportJob(data as any);
        
        // Detectar se travou (sem progresso em 3 verificações consecutivas)
        if (data.status === 'processing') {
          if (data.processed_rows === lastProcessedRows) {
            stallCount++;
            if (stallCount >= 3) {
              toast.error('Importação parece estar travada. Considere cancelar e tentar novamente.', {
                duration: 10000,
                action: {
                  label: 'Cancelar',
                  onClick: () => cancelCurrentJob()
                }
              });
            }
          } else {
            stallCount = 0;
            lastProcessedRows = data.processed_rows;
          }
        }
        
        if (data.status === 'completed') {
          toast.success(`Importação concluída! ${data.inserted_rows} registros inseridos.`);
        } else if (data.status === 'failed') {
          toast.error(`Importação falhou: ${data.error_message}`);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [importJob]);

  const cancelCurrentJob = async () => {
    if (!importJob) return;

    try {
      const { error } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'failed',
          error_message: 'Cancelado pelo usuário',
          completed_at: new Date().toISOString()
        })
        .eq('id', importJob.id);

      if (error) throw error;

      toast.success('Importação cancelada');
      setImportJob(null);
      setShowCancelDialog(false);
      setWizardState({ step: 'upload', csvHeaders: [], sampleData: [], columnMapping: {} });
    } catch (error) {
      console.error('Erro ao cancelar job:', error);
      toast.error('Erro ao cancelar importação');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadingFile(true);
      toast.info('Analisando arquivo CSV...');

      Papa.parse(file, {
        preview: 10,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            toast.error('Arquivo CSV vazio');
            setUploadingFile(false);
            return;
          }

          const headers = results.data[0] as string[];
          const sampleData = results.data.slice(1) as string[][];

          // Auto-map columns
          const autoMapping: ColumnMappingWithPriority = {};
          headers.forEach(csvHeader => {
            const normalized = csvHeader.toLowerCase().trim();
            const match = DEFAULT_FICHAS_MAPPINGS.find(m =>
              m.legacyAliases.some(alias => alias.toLowerCase() === normalized)
            );
            if (match) {
              autoMapping[match.supabaseField] = { primary: csvHeader };
            }
          });

          setWizardState({
            step: 'mapping',
            csvHeaders: headers,
            sampleData,
            columnMapping: autoMapping,
            fileName: file.name,
            fileSize: file.size,
            file
          });

          toast.success(`${Object.keys(autoMapping).length} campos auto-mapeados!`);
          setUploadingFile(false);
        },
        error: (error) => {
          toast.error(`Erro ao ler CSV: ${error.message}`);
          setUploadingFile(false);
        }
      });
    } catch (error: any) {
      toast.error(error.message);
      setUploadingFile(false);
    }
  };

  const handleAutoMap = () => {
    const autoMapping: ColumnMappingWithPriority = {};
    wizardState.csvHeaders.forEach(csvHeader => {
      const normalized = csvHeader.toLowerCase().trim();
      const match = DEFAULT_FICHAS_MAPPINGS.find(m =>
        m.legacyAliases.some(alias => alias.toLowerCase() === normalized)
      );
      if (match) {
        autoMapping[match.supabaseField] = { primary: csvHeader };
      }
    });

    setWizardState(prev => ({ ...prev, columnMapping: autoMapping }));
    toast.success(`${Object.keys(autoMapping).length} campos mapeados!`);
  };

  const handleMappingConfirm = async () => {
    try {
      setProcessingImport(true);

      if (Object.keys(wizardState.columnMapping).length === 0) {
        toast.error('Mapeie pelo menos uma coluna');
        setProcessingImport(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      if (!wizardState.file) throw new Error('Arquivo não encontrado');

      toast.info('Enviando arquivo...');

      // Upload file
      const filePath = `${user.id}/${Date.now()}_${wizardState.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('csv-imports')
        .upload(filePath, wizardState.file);

      if (uploadError) throw uploadError;

      // Create job
      const { data: newJob, error: jobError } = await supabase
        .from('import_jobs')
        .insert([{
          file_path: filePath,
          file_name: wizardState.fileName!,
          file_size: wizardState.fileSize!,
          column_mapping: wizardState.columnMapping as any,
          target_table: 'leads',
          status: 'pending',
          user_id: user.id
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      // Start processing
      const { error: processError } = await supabase.functions.invoke('process-csv-import', {
        body: { job_id: newJob.id }
      });

      if (processError) throw processError;

      setImportJob(newJob as any);
      setWizardState(prev => ({ ...prev, step: 'processing' }));
      toast.success('Importação iniciada!');
      setProcessingImport(false);
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message);
      setProcessingImport(false);
    }
  };

  const handleClose = () => {
    setWizardState({ step: 'upload', csvHeaders: [], sampleData: [], columnMapping: {} });
    setUploadingFile(false);
    setProcessingImport(false);
    setImportJob(null);
    setExistingJob(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importação de Leads via CSV
            </DialogTitle>
            <DialogDescription>
              {wizardState.step === 'upload' && 'Selecione um arquivo CSV'}
              {wizardState.step === 'mapping' && 'Configure o mapeamento de colunas'}
              {wizardState.step === 'processing' && 'Acompanhe o progresso'}
            </DialogDescription>
          </DialogHeader>

          {/* Upload Step */}
          {wizardState.step === 'upload' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 py-8">
                  <Upload className="h-16 w-16 text-muted-foreground" />
                  <p className="text-lg font-medium">Selecione um arquivo CSV</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button asChild disabled={uploadingFile}>
                      <span>
                        {uploadingFile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Selecionar Arquivo
                      </span>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapping Step */}
          {wizardState.step === 'mapping' && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{wizardState.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {wizardState.csvHeaders.length} colunas detectadas
                </p>
              </div>

              <ColumnMappingDragDrop
                csvHeaders={wizardState.csvHeaders}
                mapping={wizardState.columnMapping}
                onMappingChange={(mapping) => setWizardState(prev => ({ ...prev, columnMapping: mapping }))}
                onAutoMap={handleAutoMap}
              />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleMappingConfirm} disabled={processingImport}>
                  {processingImport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Iniciar Importação
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {wizardState.step === 'processing' && importJob && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {importJob.status === 'processing' ? (
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  ) : importJob.status === 'completed' ? (
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                  ) : (
                    <XCircle className="h-16 w-16 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {importJob.status === 'processing' ? 'Processando' :
                     importJob.status === 'completed' ? 'Concluído' : 'Falhou'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{importJob.file_name}</p>
                </div>
              </div>

              {importJob.total_rows && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{importJob.processed_rows} / {importJob.total_rows}</span>
                  </div>
                  <Progress value={(importJob.processed_rows / importJob.total_rows) * 100} />
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Total</div>
                      <div className="font-medium">{importJob.total_rows}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Inseridos</div>
                      <div className="font-medium text-green-600">{importJob.inserted_rows}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Falharam</div>
                      <div className="font-medium text-red-600">{importJob.failed_rows}</div>
                    </div>
                  </div>

                  {importJob.status === 'processing' && importJob.processed_rows > 0 && importJob.started_at && (
                    <div className="text-xs text-center text-muted-foreground">
                      {(() => {
                        const elapsedMs = Date.now() - new Date(importJob.started_at).getTime();
                        const recordsPerSecond = (importJob.processed_rows / (elapsedMs / 1000)).toFixed(1);
                        const remainingRecords = importJob.total_rows - importJob.processed_rows;
                        const estimatedSeconds = Math.round(remainingRecords / parseFloat(recordsPerSecond));
                        return `${recordsPerSecond} registros/s • ~${estimatedSeconds}s restantes`;
                      })()}
                    </div>
                  )}
                </div>
              )}

              {importJob.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{importJob.error_message}</AlertDescription>
                </Alert>
              )}

              {importJob.errors && Array.isArray(importJob.errors) && importJob.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erros ({importJob.errors.length})</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32 mt-2">
                      <div className="space-y-1 text-xs font-mono">
                        {importJob.errors.slice(0, 10).map((error, i) => (
                          <div key={i}>{error}</div>
                        ))}
                        {importJob.errors.length > 10 && (
                          <div className="italic">... e mais {importJob.errors.length - 10}</div>
                        )}
                      </div>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                {importJob.status === 'processing' && (
                  <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                )}
                {importJob.status !== 'processing' && (
                  <Button onClick={handleClose} className="flex-1">Fechar</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Os registros já processados serão mantidos no banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar</AlertDialogCancel>
            <AlertDialogAction onClick={cancelCurrentJob}>Sim, Cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
