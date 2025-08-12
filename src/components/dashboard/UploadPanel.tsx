import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Database, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

interface UploadPanelProps {
  onDataLoad: (data: { fichas: any[], projetos: any[] }) => void;
  onSourceChange: (source: 'sheets' | 'upload') => void;
  currentSource: 'sheets' | 'upload';
}

export const UploadPanel = ({ onDataLoad, onSourceChange, currentSource }: UploadPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ fichas?: File, projetos?: File }>({});
  const { toast } = useToast();
  const fichasInputRef = useRef<HTMLInputElement>(null);
  const projetosInputRef = useRef<HTMLInputElement>(null);

  const processExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Pega a primeira aba
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Converte para JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: ''
          });
          
          if (jsonData.length < 2) {
            throw new Error('Arquivo deve ter pelo menos cabeçalho e uma linha de dados');
          }
          
          // Primeira linha como cabeçalho
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          // Converte para objetos
          const result = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          }).filter(row => {
            // Remove linhas vazias
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

  const handleFileSelect = (type: 'fichas' | 'projetos', file: File | null) => {
    if (!file) return;
    
    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV",
        variant: "destructive"
      });
      return;
    }
    
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    
    toast({
      title: "Arquivo selecionado",
      description: `${type === 'fichas' ? 'Planilha de Fichas' : 'Planilha de Projetos'}: ${file.name}`
    });
  };

  const processUploadedData = async () => {
    if (!uploadedFiles.fichas && !uploadedFiles.projetos) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para processar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let fichasData: any[] = [];
      let projetosData: any[] = [];
      
      // Processar arquivo de fichas
      if (uploadedFiles.fichas) {
        const rawFichas = await processExcelFile(uploadedFiles.fichas);
        fichasData = rawFichas.map(row => ({
          ID: parseInt(row.ID) || parseInt(row.id) || 0,
          Projetos_Comerciais: row['Projetos_Cormeciais'] || row['Projetos_Comerciais'] || row['Projetos Comerciais'] || '',
          Gestao_de_Scouter: row['Gestao_de_Scouter'] || row['Gestão de Scouter'] || row['Scouter'] || '',
          Criado: row.Criado || '',
          Data_de_Criacao_da_Ficha: row['Data_de_Criacao_da_Ficha'] || row['Data de Criação da Ficha'] || row['Data'] || '',
          MaxScouterApp_Verificacao: row['MaxScouterApp_Verificacao'] || '',
          Valor_por_Fichas: row['Valor_por_Fichas'] || row['Valor por Fichas'] || 'R$ 0,00'
        })).filter(row => row.ID > 0 && row.Gestao_de_Scouter);
      }
      
      // Processar arquivo de projetos
      if (uploadedFiles.projetos) {
        const rawProjetos = await processExcelFile(uploadedFiles.projetos);
        projetosData = rawProjetos.map(row => ({
          Agencia_e_Seletiva: row['Agencia_e_Seletiva'] || row['Agência e Seletiva'] || row['Projeto'] || '',
          Meta_de_Fichas: parseInt(row['Meta_de_Fichas']) || parseInt(row['Meta de Fichas']) || parseInt(row['Meta']) || 0,
          Inicio_Captacao_Fichas: row['Inicio_Captacao_Fichas'] || row['Início Captação Fichas'] || row['Início'] || '',
          Termino_Captacao_Fichas: row['Termino_Captacao_Fichas'] || row['Término Captação Fichas'] || row['Término'] || ''
        })).filter(row => row.Agencia_e_Seletiva && row.Meta_de_Fichas > 0);
      }
      
      if (fichasData.length === 0 && projetosData.length === 0) {
        throw new Error('Nenhum dado válido encontrado nos arquivos');
      }
      
      // Notificar sucesso
      toast({
        title: "Dados processados com sucesso",
        description: `${fichasData.length} fichas e ${projetosData.length} projetos carregados`
      });
      
      // Enviar dados para o dashboard
      onDataLoad({ fichas: fichasData, projetos: projetosData });
      onSourceChange('upload');
      
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      toast({
        title: "Erro ao processar arquivos",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFiles = () => {
    setUploadedFiles({});
    if (fichasInputRef.current) fichasInputRef.current.value = '';
    if (projetosInputRef.current) projetosInputRef.current.value = '';
    
    toast({
      title: "Arquivos removidos",
      description: "Selecione novos arquivos para upload"
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Fonte de Dados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={currentSource} onValueChange={(value) => onSourceChange(value as 'sheets' | 'upload')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sheets" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Google Sheets
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Planilha
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sheets" className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg">
              <Database className="h-5 w-5 text-success" />
              <div>
                <p className="font-medium">Conectado ao Google Sheets</p>
                <p className="text-sm text-muted-foreground">
                  Dados atualizados automaticamente das planilhas públicas
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="fichas-upload">Planilha de Fichas (.xlsx, .csv)</Label>
                <Input
                  id="fichas-upload"
                  type="file"
                  ref={fichasInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect('fichas', e.target.files?.[0] || null)}
                />
                {uploadedFiles.fichas && (
                  <p className="text-sm text-success">✓ {uploadedFiles.fichas.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="projetos-upload">Planilha de Projetos (.xlsx, .csv)</Label>
                <Input
                  id="projetos-upload"
                  type="file"
                  ref={projetosInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect('projetos', e.target.files?.[0] || null)}
                />
                {uploadedFiles.projetos && (
                  <p className="text-sm text-success">✓ {uploadedFiles.projetos.name}</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={processUploadedData}
                  disabled={isProcessing || (!uploadedFiles.fichas && !uploadedFiles.projetos)}
                  className="flex-1"
                >
                  {isProcessing ? 'Processando...' : 'Carregar Dados'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearFiles}
                  disabled={!uploadedFiles.fichas && !uploadedFiles.projetos}
                >
                  Limpar
                </Button>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Formato esperado:</p>
                  <p className="text-muted-foreground">
                    Colunas necessárias: ID, Projetos_Comerciais, Gestao_de_Scouter, Data_de_Criacao_da_Ficha, Valor_por_Fichas
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};