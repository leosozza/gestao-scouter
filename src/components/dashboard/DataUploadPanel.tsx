
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileSpreadsheet, 
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  records?: number;
  uploadedAt: string;
}

export const DataUploadPanel = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      const fileId = Math.random().toString(36).substr(2, 9);
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
        uploadedAt: new Date().toISOString()
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);

      // Simular upload
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? { ...f, progress } : f)
        );
      }

      // Simular processamento
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? { ...f, status: 'processing' } : f)
      );

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Finalizar
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? { 
          ...f, 
          status: 'completed',
          records: Math.floor(Math.random() * 1000) + 100
        } : f)
      );

      toast({
        title: "Upload concluído",
        description: `Arquivo ${file.name} processado com sucesso`
      });
    }

    setIsUploading(false);
    event.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    toast({
      title: "Arquivo removido",
      description: "O arquivo foi removido da lista"
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Upload de Dados
          </h1>
          <p className="text-muted-foreground">
            Importe planilhas e dados para o sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload de Arquivos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Área de Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Importar Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aceitos: Excel (.xlsx, .xls), CSV (.csv) - Máximo 10MB por arquivo
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Suporte para múltiplos arquivos
                  </p>
                  <div className="flex justify-center">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button asChild disabled={isUploading}>
                        <span>
                          {isUploading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Selecionar Arquivos
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de Arquivos em Upload */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Arquivos</h4>
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span className="font-medium">{file.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="mb-2" />
                      )}
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          Status: {file.status === 'uploading' && 'Enviando...'}
                          {file.status === 'processing' && 'Processando...'}
                          {file.status === 'completed' && `Concluído - ${file.records} registros`}
                          {file.status === 'error' && 'Erro no processamento'}
                        </span>
                        <span>{new Date(file.uploadedAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Histórico de uploads será implementado
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelos de Planilha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <h4 className="font-semibold">Modelo Leads</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Template para importação de dados de leads
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <h4 className="font-semibold">Modelo Scouters</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Template para importação de dados de scouters
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <h4 className="font-semibold">Modelo Projetos</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Template para importação de dados de projetos
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <h4 className="font-semibold">Modelo Completo</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Template com todas as abas necessárias
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Modelo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
