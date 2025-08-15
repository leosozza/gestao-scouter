import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Database, DollarSign, Download, Upload, RefreshCw, FileSpreadsheet, Plug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import { TemplateModal } from "./TemplateModal";
import { IntegrationsPanel } from "./integrations/IntegrationsPanel";
import { AjudaCustoSettings } from "./AjudaCustoSettings";

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate: (config: any) => void;
  currentConfig: {
    spreadsheetUrl: string;
    ajudaCustoDiaria: number;
    valorPorFicha: number;
  };
}

export const ConfigPanel = ({ isOpen, onClose, onConfigUpdate, currentConfig }: ConfigPanelProps) => {
  const [config, setConfig] = useState(currentConfig);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSave = () => {
    onConfigUpdate(config);
    toast({
      title: "Configurações salvas",
      description: "As configurações foram atualizadas com sucesso"
    });
    onClose();
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      const [fichas, projetos] = await Promise.all([
        GoogleSheetsService.fetchFichas(),
        GoogleSheetsService.fetchProjetos()
      ]);
      
      toast({
        title: "Conexão bem-sucedida",
        description: `${fichas.length} fichas e ${projetos.length} projetos encontrados na planilha`
      });
    } catch (error) {
      console.error('Erro na conexão:', error);
      toast({
        title: "Erro na conexão",
        description: error instanceof Error ? error.message : "Verifique se a planilha está pública e o link está correto",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Arquivo carregado",
        description: `Processando arquivo: ${file.name}`,
      });
      // Aqui seria implementada a lógica de upload do arquivo
    }
  };

  const handleDownloadReport = () => {
    toast({
      title: "Relatório em preparação",
      description: "O download do relatório será iniciado em breve"
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-5xl max-h-[90vh] overflow-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Sistema MaxFama
              </CardTitle>
              <Button variant="ghost" onClick={onClose}>×</Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="database" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="database">Fonte de Dados</TabsTrigger>
                  <TabsTrigger value="values">Valores</TabsTrigger>
                  <TabsTrigger value="integrations">Integrações</TabsTrigger>
                  <TabsTrigger value="reports">Relatórios</TabsTrigger>
                </TabsList>
                
                <TabsContent value="database" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">Configuração da Fonte de Dados</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Google Sheets</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="spreadsheet-url">URL da Planilha do Google Sheets</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="spreadsheet-url"
                              value={config.spreadsheetUrl}
                              onChange={(e) => setConfig(prev => ({ ...prev, spreadsheetUrl: e.target.value }))}
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              className="flex-1"
                            />
                            <Button 
                              variant="outline" 
                              onClick={handleTestConnection}
                              disabled={isTestingConnection}
                            >
                              {isTestingConnection ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                'Testar'
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            URL atual: https://docs.google.com/spreadsheets/d/14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o/edit
                          </p>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Modelo de Planilha</h4>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowTemplate(true)}
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Ver Modelo
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Use o modelo correto para garantir que os dados sejam carregados corretamente
                          </p>
                        </div>
                        
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Instruções para Google Sheets:</h4>
                          <ol className="text-sm space-y-1 list-decimal list-inside">
                            <li>Abra sua planilha no Google Sheets</li>
                            <li>Clique em "Arquivo" → "Compartilhar" → "Publicar na web"</li>
                            <li>Selecione "Toda a planilha" e formato "CSV"</li>
                            <li>Clique em "Publicar" e copie o link gerado</li>
                            <li>Cole o link no campo acima</li>
                          </ol>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Upload de Arquivo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="file-upload">Importar planilha (.xlsx, .csv)</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                id="file-upload"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="flex-1"
                              />
                              <Upload className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Faça upload de um arquivo Excel ou CSV com os dados
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="values" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">Configuração de Valores</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ajuda-custo">Ajuda de Custo por Dia (R$)</Label>
                      <Input
                        id="ajuda-custo"
                        type="number"
                        step="0.01"
                        value={config.ajudaCustoDiaria}
                        onChange={(e) => setConfig(prev => ({ ...prev, ajudaCustoDiaria: parseFloat(e.target.value) || 0 }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Valor pago por dia trabalhado
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="valor-ficha">Valor por Ficha Padrão (R$)</Label>
                      <Input
                        id="valor-ficha"
                        type="number"
                        step="0.01"
                        value={config.valorPorFicha}
                        onChange={(e) => setConfig(prev => ({ ...prev, valorPorFicha: parseFloat(e.target.value) || 0 }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Valor padrão por ficha quando não especificado
                      </p>
                    </div>
                  </div>

                  {/* NOVO BLOCO: Ajuda de Custo - Seletivas */}
                  <AjudaCustoSettings />

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Informações:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>A ajuda de custo é calculada automaticamente baseada no número de dias trabalhados</li>
                      <li>O valor por ficha pode ser sobrescrito individualmente na planilha</li>
                      <li>Os cálculos são atualizados em tempo real conforme os filtros aplicados</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Plug className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">Integrações Externas</h3>
                  </div>
                  
                  <IntegrationsPanel />
                </TabsContent>
                
                <TabsContent value="reports" className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Download className="h-4 w-4" />
                    <h3 className="text-lg font-semibold">Relatórios</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Relatório Completo</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Baixe um relatório completo com todos os dados filtrados, incluindo KPIs, 
                          tabelas de scouters, projetos e análises detalhadas.
                        </p>
                        <Button onClick={handleDownloadReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Baixar Relatório (PDF)
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Exportar Dados</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Exporte os dados filtrados em formato Excel para análises externas.
                        </p>
                        <Button variant="outline" onClick={handleDownloadReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Excel
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <TemplateModal 
        isOpen={showTemplate} 
        onClose={() => setShowTemplate(false)} 
      />
    </>
  );
};
