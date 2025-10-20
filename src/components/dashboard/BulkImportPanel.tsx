import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/lib/supabase-helper';
import * as XLSX from 'xlsx';

interface BulkImportPanelProps {
  onComplete?: () => void;
}

interface ProcessingStats {
  total: number;
  processed: number;
  inserted: number;
  failed: number;
  errors: string[];
}

export const BulkImportPanel = ({ onComplete }: BulkImportPanelProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({
    total: 0,
    processed: 0,
    inserted: 0,
    failed: 0,
    errors: []
  });
  const { toast } = useToast();

  const processExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
          });
          
          if (jsonData.length < 2) {
            throw new Error('Arquivo deve ter pelo menos cabeçalho e uma linha de dados');
          }
          
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          const result = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          }).filter(row => {
            return Object.values(row).some(value => value !== '');
          });
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseDate = (dateStr: any): string | null => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    
    // Formato DD/MM/YYYY ou DD/MM/YYYY HH:MM:SS
    const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (brMatch) {
      const [, day, month, year, hour = '00', minute = '00', second = '00'] = brMatch;
      return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
    }
    
    // Tentar parse direto e retornar ISO completo
    const d = new Date(str);
    return isNaN(+d) ? null : d.toISOString();
  };

  const parseBRL = (input: unknown): number => {
    if (input == null) return 0;
    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
    const s = String(input).replace(/\s/g,'').replace(/[Rr]\$?/g,'').replace(/\./g,'').replace(/,/g,'.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const normString = (v: any): string => {
    return (v ?? "").toString().trim();
  };

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const mapFieldAliases = (row: any) => {
    return {
      id: row.ID || row.id || row.Id || null,
      projeto: row['Projetos_Comerciais'] || row['Projetos Comerciais'] || row.Projeto || row.projeto || '',
      scouter: row['Gestao_de_Scouter'] || row['Gestão de Scouter'] || row['Gestão de  Scouter'] || row.Scouter || row.scouter || '',
      criado: row['Data_de_Criacao_da_Ficha'] || row['Data de Criação da Ficha'] || row.Criado || row.criado || row.Data || '',
      nome: row.Nome || row.nome || '',
      telefone: row.Telefone || row.telefone || '',
      email: row.Email || row.email || '',
      idade: row.Idade || row.idade || '',
      valor_ficha: row['Valor_por_Fichas'] || row['Valor por Leads'] || row['Valor por Ficha'] || row['R$/Ficha'] || row.Valor || row.valor_ficha || '',
      latitude: row.LAT || row.lat || row.latitude || null,
      longitude: row.LNG || row.lng || row.longitude || null
    };
  };

  const processBulkImport = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione um arquivo CSV ou XLSX para importar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setStats({ total: 0, processed: 0, inserted: 0, failed: 0, errors: [] });

    try {
      // Option 1: Use Edge Function for CSV files (recommended for better encoding support)
      if (file.name.toLowerCase().endsWith('.csv')) {
        console.log('🚀 Usando Edge Function para importação de CSV...');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('table', 'leads');

        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/csv-import-leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || supabase.supabaseKey}`,
          },
          body: formData
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro na importação');
        }

        setStats({
          total: result.stats.total,
          processed: result.stats.total,
          inserted: result.stats.updated,
          failed: result.stats.failed,
          errors: result.errors || []
        });

        toast({
          title: "Importação concluída!",
          description: `${result.stats.updated} registros importados com sucesso.`
        });

        if (onComplete) onComplete();
        return;
      }

      // Option 2: Original Excel processing (for .xlsx files)
      console.log('📊 Processando arquivo Excel localmente...');
      
      // Processar arquivo
      const rawData = await processExcelFile(file);
      const total = rawData.length;
      
      setStats(prev => ({ ...prev, total }));

      toast({
        title: "Processando arquivo",
        description: `${total} registros encontrados. Iniciando importação...`
      });

      // Transformar dados
      const leads = rawData.map(row => {
        const mapped = mapFieldAliases(row);
        const createdDate = parseDate(mapped.criado);
        const valorNum = parseBRL(mapped.valor_ficha);
        
        return {
          id: mapped.id ? parseInt(String(mapped.id)) : null,
          nome: normString(mapped.nome),
          projeto: normString(mapped.projeto),
          scouter: normString(mapped.scouter),
          criado: createdDate,
          telefone: normString(mapped.telefone),
          email: normString(mapped.email),
          idade: normString(mapped.idade),
          valor_ficha: valorNum || null,
          latitude: mapped.latitude ? parseFloat(String(mapped.latitude)) : null,
          longitude: mapped.longitude ? parseFloat(String(mapped.longitude)) : null,
          deleted: false,
          raw: row
        };
      }).filter(f => f.nome); // Apenas registros com nome

      // Dividir em batches de 2000
      const chunks = chunkArray(leads, 2000);
      let totalInserted = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      // Processar cada batch
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const { data, error } = await supabase
            .from('leads')
            .upsert(chunk, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select('id');

          if (error) {
            console.error(`Erro no batch ${i + 1}:`, error);
            errors.push(`Batch ${i + 1}: ${error.message}`);
            totalFailed += chunk.length;
          } else {
            totalInserted += data?.length || 0;
          }
        } catch (err) {
          console.error(`Erro crítico no batch ${i + 1}:`, err);
          errors.push(`Batch ${i + 1}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
          totalFailed += chunk.length;
        }

        // Atualizar progresso
        setStats(prev => ({
          ...prev,
          processed: Math.min((i + 1) * 2000, total),
          inserted: totalInserted,
          failed: totalFailed,
          errors
        }));
      }

      // Resultado final
      if (totalFailed === 0) {
        toast({
          title: "Importação concluída com sucesso!",
          description: `${totalInserted} registros inseridos no banco de dados`
        });
      } else if (totalInserted > 0) {
        toast({
          title: "Importação parcialmente concluída",
          description: `${totalInserted} inseridos, ${totalFailed} falharam. Verifique os logs.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Falha na importação",
          description: "Nenhum registro foi inserido. Verifique o formato do arquivo.",
          variant: "destructive"
        });
      }

      if (onComplete && totalInserted > 0) {
        setTimeout(onComplete, 1000);
      }

    } catch (error) {
      console.error('Erro ao processar importação:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione um arquivo Excel (.xlsx, .xls) ou CSV",
        variant: "destructive"
      });
      return;
    }

    // Verificar tamanho (300MB max)
    const maxSize = 300 * 1024 * 1024; // 300MB
    if (selectedFile.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 300MB",
        variant: "destructive"
      });
      return;
    }
    
    setFile(selectedFile);
    toast({
      title: "Arquivo selecionado",
      description: `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`
    });
  };

  const progress = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importação Massiva de Dados
        </CardTitle>
        <CardDescription>
          Carregue um arquivo CSV ou XLSX com até 300MB e 200k+ registros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="bulk-upload">Selecionar Arquivo</Label>
          <Input
            id="bulk-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            disabled={isProcessing}
          />
          {file && !isProcessing && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* Expected Fields */}
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">Campos esperados no CSV/XLSX:</p>
            <p className="text-muted-foreground">
              ID, Projeto, Scouter, Nome, Telefone, Email, Idade, Data, Valor, LAT, LNG
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              O sistema reconhece automaticamente variações de nome dos campos
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processando...</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-medium">{stats.total}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Processados:</span>
                <span className="ml-2 font-medium">{stats.processed}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Inseridos:</span>
                <span className="ml-2 font-medium text-success">{stats.inserted}</span>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {stats.errors.length > 0 && (
          <div className="space-y-2 p-3 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">Erros encontrados:</span>
            </div>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {stats.errors.slice(0, 10).map((error, idx) => (
                <li key={idx} className="text-destructive/80">• {error}</li>
              ))}
              {stats.errors.length > 10 && (
                <li className="text-destructive/60">... e mais {stats.errors.length - 10} erros</li>
              )}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <Button 
          onClick={processBulkImport}
          disabled={!file || isProcessing}
          className="w-full"
          size="lg"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isProcessing ? 'Importando...' : 'Iniciar Importação'}
        </Button>
      </CardContent>
    </Card>
  );
};
