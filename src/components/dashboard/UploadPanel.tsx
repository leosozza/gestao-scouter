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
  onDataLoad: (data: { leads: any[], projetos: any[] }) => void;
  onSourceChange: (source: 'sheets' | 'upload' | 'custom-sheets') => void;
  currentSource: 'sheets' | 'upload' | 'custom-sheets';
}

export const UploadPanel = ({ onDataLoad, onSourceChange, currentSource }: UploadPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ leads?: File, projetos?: File }>({});
  const [customSheetUrl, setCustomSheetUrl] = useState('');
  const [customGids, setCustomGids] = useState({ leads: '452792639', projetos: '449483735' });
  const { toast } = useToast();
  const leadsInputRef = useRef<HTMLInputElement>(null);
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
      description: `${type === 'fichas' ? 'Planilha de Leads' : 'Planilha de Projetos'}: ${file.name}`
    });
  };

  const processUploadedData = async () => {
    if (!uploadedFiles.leads && !uploadedFiles.projetos) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um arquivo para processar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let leadsData: any[] = [];
      let projetosData: any[] = [];
      
      // Processar arquivo de leads
      if (uploadedFiles.fichas) {
        const rawFichas = await processExcelFile(uploadedFiles.fichas);
        leadsData = rawFichas.map(row => ({
          ID: parseInt(row.ID) || parseInt(row.id) || 0,
          Projetos_Comerciais: row['Projetos_Cormeciais'] || row['Projetos_Comerciais'] || row['Projetos Comerciais'] || '',
          Gestao_de_Scouter: row['Gestao_de_Scouter'] || row['Gestão de Scouter'] || row['Scouter'] || '',
          Criado: row.Criado || '',
          Data_de_Criacao_da_Ficha: row['Data_de_Criacao_da_Ficha'] || row['Data de Criação da Ficha'] || row['Data'] || '',
          MaxScouterApp_Verificacao: row['MaxScouterApp_Verificacao'] || '',
          Valor_por_Fichas: row['Valor_por_Fichas'] || row['Valor por Leads'] || 'R$ 0,00'
        })).filter(row => row.ID > 0 && row.Gestao_de_Scouter);
      }
      
      // Processar arquivo de projetos
      if (uploadedFiles.projetos) {
        const rawProjetos = await processExcelFile(uploadedFiles.projetos);
        projetosData = rawProjetos.map(row => ({
          Agencia_e_Seletiva: row['Agencia_e_Seletiva'] || row['Agência e Seletiva'] || row['Projeto'] || '',
          Meta_de_Fichas: parseInt(row['Meta_de_Fichas']) || parseInt(row['Meta de Leads']) || parseInt(row['Meta']) || 0,
          Inicio_Captacao_Fichas: row['Inicio_Captacao_Fichas'] || row['Início Captação Leads'] || row['Início'] || '',
          Termino_Captacao_Fichas: row['Termino_Captacao_Fichas'] || row['Término Captação Leads'] || row['Término'] || ''
        })).filter(row => row.Agencia_e_Seletiva && row.Meta_de_Fichas > 0);
      }
      
      if (fichasData.length === 0 && projetosData.length === 0) {
        throw new Error('Nenhum dado válido encontrado nos arquivos');
      }
      
      // Notificar sucesso
      toast({
        title: "Dados processados com sucesso",
        description: `${fichasData.length} leads e ${projetosData.length} projetos carregados`
      });
      
      // Enviar dados para o dashboard
      onDataLoad({ leads: leadsData, projetos: projetosData });
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

  const extractSpreadsheetId = (url: string): string | null => {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const processCustomSheets = async () => {
    if (!customSheetUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, cole o link da planilha do Google Sheets",
        variant: "destructive"
      });
      return;
    }

    const spreadsheetId = extractSpreadsheetId(customSheetUrl);
    if (!spreadsheetId) {
      toast({
        title: "URL inválida",
        description: "Por favor, cole um link válido do Google Sheets",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const [fichasData, projetosData] = await Promise.all([
        fetchCustomSheetData(spreadsheetId, customGids.fichas),
        fetchCustomSheetData(spreadsheetId, customGids.projetos)
      ]);

      const processedFichas = leadsData.map(row => ({
        ID: parseInt(row.ID) || 0,
        Projetos_Comerciais: row['Projetos_Cormeciais'] || row['Projetos_Comerciais'] || row['Projetos Comerciais'] || '',
        Gestao_de_Scouter: row['Gestao_de_Scouter'] || row['Gestão de Scouter'] || '',
        Criado: row.Criado || '',
        Data_de_Criacao_da_Ficha: row['Data_de_Criacao_da_Ficha'] || row['Data de Criação da Ficha'] || '',
        MaxScouterApp_Verificacao: row['MaxScouterApp_Verificacao'] || '',
        Valor_por_Fichas: row['Valor_por_Fichas'] || row['Valor por Leads'] || 'R$ 0,00'
      })).filter(row => row.ID > 0 && row.Gestao_de_Scouter);

      const processedProjetos = projetosData.map(row => ({
        Agencia_e_Seletiva: row['Agencia_e_Seletiva'] || row['agencia e seletiva'] || '',
        Meta_de_Fichas: parseInt(row['Meta_de_Fichas']) || parseInt(row['meta de leads']) || 0,
        Inicio_Captacao_Fichas: row['Inicio_Captacao_Fichas'] || row['Inicio Captação leads'] || '',
        Termino_Captacao_Fichas: row['Termino_Captacao_Fichas'] || row['Termino Captação leads'] || ''
      })).filter(row => row.Agencia_e_Seletiva && row.Meta_de_Fichas > 0);

      if (processedFichas.length === 0 && processedProjetos.length === 0) {
        throw new Error('Nenhum dado válido encontrado na planilha');
      }

      toast({
        title: "Dados carregados com sucesso",
        description: `${processedFichas.length} leads e ${processedProjetos.length} projetos da planilha personalizada`
      });

      onDataLoad({ leads: processedFichas, projetos: processedProjetos });
      onSourceChange('custom-sheets');

    } catch (error) {
      console.error('Erro ao carregar planilha:', error);
      toast({
        title: "Erro ao carregar planilha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchCustomSheetData = async (spreadsheetId: string, gid: string): Promise<any[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      return csvToJson(csvText);
    } catch (error) {
      console.error(`Erro ao buscar dados da planilha (GID: ${gid}):`, error);
      throw error;
    }
  };

  const csvToJson = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim().replace(/"/g, '') || '';
        });
        data.push(row);
      }
    }

    return data;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const clearFiles = () => {
    setUploadedFiles({});
    if (fichasInputRef.current) leadsInputRef.current.value = '';
    if (projetosInputRef.current) projetosInputRef.current.value = '';
    
    toast({
      title: "Arquivos removidos",
      description: "Selecione novos arquivos para upload"
    });
  };

  const clearCustomSheets = () => {
    setCustomSheetUrl('');
    setCustomGids({ leads: '452792639', projetos: '449483735' });
    
    toast({
      title: "Link removido",
      description: "Cole um novo link para carregar dados"
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
        <Tabs value={currentSource} onValueChange={(value) => onSourceChange(value as 'sheets' | 'upload' | 'custom-sheets')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sheets" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Google Sheets
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Planilha
            </TabsTrigger>
            <TabsTrigger value="custom-sheets" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Link Google Sheets
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
                <Label htmlFor="fichas-upload">Planilha de Leads (.xlsx, .csv)</Label>
                <Input
                  id="fichas-upload"
                  type="file"
                  ref={fichasInputRef}
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFileSelect('fichas', e.target.files?.[0] || null)}
                />
                {uploadedFiles.leads && (
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
                  disabled={isProcessing || (!uploadedFiles.leads && !uploadedFiles.projetos)}
                  className="flex-1"
                >
                  {isProcessing ? 'Processando...' : 'Carregar Dados'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearFiles}
                  disabled={!uploadedFiles.leads && !uploadedFiles.projetos}
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
          
          <TabsContent value="custom-sheets" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="sheet-url">Link da Planilha do Google Sheets</Label>
                <Input
                  id="sheet-url"
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={customSheetUrl}
                  onChange={(e) => setCustomSheetUrl(e.target.value)}
                />
                {customSheetUrl && (
                  <p className="text-sm text-success">✓ Link inserido</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fichas-gid">GID da Aba Leads</Label>
                  <Input
                    id="fichas-gid"
                    placeholder="452792639"
                    value={customGids.fichas}
                    onChange={(e) => setCustomGids(prev => ({ ...prev, leads: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projetos-gid">GID da Aba Projetos</Label>
                  <Input
                    id="projetos-gid"
                    placeholder="449483735"
                    value={customGids.projetos}
                    onChange={(e) => setCustomGids(prev => ({ ...prev, projetos: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={processCustomSheets}
                  disabled={isProcessing || !customSheetUrl.trim()}
                  className="flex-1"
                >
                  {isProcessing ? 'Carregando...' : 'Carregar da Planilha'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearCustomSheets}
                  disabled={!customSheetUrl}
                >
                  Limpar
                </Button>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-info/10 rounded-lg">
                <AlertCircle className="h-4 w-4 text-info mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Como usar:</p>
                  <p className="text-muted-foreground">
                    1. Cole o link da planilha do Google Sheets<br/>
                    2. Ajuste os GIDs das abas se necessário<br/>
                    3. A planilha deve ser pública para acesso
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