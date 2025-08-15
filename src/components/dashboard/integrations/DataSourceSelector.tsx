
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  FileSpreadsheet, 
  Shuffle,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GoogleSheetsService } from "@/services/googleSheetsService";

type DataSource = 'sheets' | 'custom-sheets' | 'bitrix' | 'hybrid';

interface DataSourceConfig {
  current: DataSource;
  available: {
    sheets: boolean;
    bitrix: boolean;
  };
  customSheets: {
    url: string;
    gids: {
      fichas: string;
      projetos: string;
    };
  };
}

export const DataSourceSelector = () => {
  const [config, setConfig] = useState<DataSourceConfig>({
    current: 'sheets',
    available: {
      sheets: true,
      bitrix: false,
    },
    customSheets: {
      url: '',
      gids: {
        fichas: '452792639',
        projetos: '449483735'
      }
    }
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Carregar configuração salva do localStorage
    const savedSource = localStorage.getItem('maxfama_data_source') as DataSource;
    const savedCustomUrl = localStorage.getItem('maxfama_custom_sheets_url');
    const savedGids = localStorage.getItem('maxfama_custom_gids');
    
    if (savedSource) {
      setConfig(prev => ({ ...prev, current: savedSource }));
    }
    
    if (savedCustomUrl) {
      setConfig(prev => ({
        ...prev,
        customSheets: {
          ...prev.customSheets,
          url: savedCustomUrl
        }
      }));
    }
    
    if (savedGids) {
      try {
        const parsedGids = JSON.parse(savedGids);
        setConfig(prev => ({
          ...prev,
          customSheets: {
            ...prev.customSheets,
            gids: parsedGids
          }
        }));
      } catch (error) {
        console.error('Erro ao carregar GIDs salvos:', error);
      }
    }
  }, []);

  const handleSourceChange = (newSource: DataSource) => {
    setConfig(prev => ({ ...prev, current: newSource }));
    localStorage.setItem('maxfama_data_source', newSource);
    
    toast({
      title: "Fonte de dados alterada",
      description: `Agora usando: ${getSourceLabel(newSource)}`
    });
  };

  const handleCustomUrlChange = (url: string) => {
    setConfig(prev => ({
      ...prev,
      customSheets: {
        ...prev.customSheets,
        url
      }
    }));
    localStorage.setItem('maxfama_custom_sheets_url', url);
  };

  const handleGidChange = (type: 'fichas' | 'projetos', value: string) => {
    const newGids = {
      ...config.customSheets.gids,
      [type]: value
    };
    
    setConfig(prev => ({
      ...prev,
      customSheets: {
        ...prev.customSheets,
        gids: newGids
      }
    }));
    
    localStorage.setItem('maxfama_custom_gids', JSON.stringify(newGids));
  };

  const extractSpreadsheetId = (url: string): string | null => {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      if (config.current === 'custom-sheets') {
        if (!config.customSheets.url.trim()) {
          throw new Error('Por favor, insira o link da planilha');
        }
        
        const spreadsheetId = extractSpreadsheetId(config.customSheets.url);
        if (!spreadsheetId) {
          throw new Error('Link da planilha inválido');
        }
        
        // Testar conexão com planilha personalizada
        const [fichasData, projetosData] = await Promise.all([
          testCustomSheetConnection(spreadsheetId, config.customSheets.gids.fichas),
          testCustomSheetConnection(spreadsheetId, config.customSheets.gids.projetos)
        ]);
        
        toast({
          title: "Conexão bem-sucedida",
          description: `${fichasData.length} fichas e ${projetosData.length} projetos encontrados na planilha personalizada`
        });
      } else {
        // Testar conexão padrão
        const [fichas, projetos] = await Promise.all([
          GoogleSheetsService.fetchFichas(),
          GoogleSheetsService.fetchProjetos()
        ]);
        
        toast({
          title: "Conexão bem-sucedida",
          description: `${fichas.length} fichas e ${projetos.length} projetos encontrados na planilha padrão`
        });
      }
    } catch (error) {
      console.error('Erro na conexão:', error);
      toast({
        title: "Erro na conexão",
        description: error instanceof Error ? error.message : "Verifique se a planilha está pública e os GIDs estão corretos",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testCustomSheetConnection = async (spreadsheetId: string, gid: string): Promise<any[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - Verifique se a planilha está pública`);
    }
    
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) {
      throw new Error(`GID ${gid} não encontrado na planilha`);
    }
    
    // Parse básico do CSV para contar registros
    const lines = csvText.split('\n').filter(line => line.trim());
    return lines.slice(1); // Remove header
  };

  const getSourceLabel = (source: DataSource) => {
    switch (source) {
      case 'sheets': return 'Google Sheets (Padrão)';
      case 'custom-sheets': return 'Google Sheets (Personalizado)';
      case 'bitrix': return 'Bitrix24';
      case 'hybrid': return 'Híbrido (Sheets + Bitrix)';
    }
  };

  const getSourceIcon = (source: DataSource) => {
    switch (source) {
      case 'sheets': 
      case 'custom-sheets': 
        return <FileSpreadsheet className="h-5 w-5" />;
      case 'bitrix': return <Database className="h-5 w-5" />;
      case 'hybrid': return <Shuffle className="h-5 w-5" />;
    }
  };

  const getSourceDescription = (source: DataSource) => {
    switch (source) {
      case 'sheets': 
        return 'Usar planilha padrão do MaxFama. Configuração automática.';
      case 'custom-sheets':
        return 'Usar sua própria planilha do Google Sheets. Requer link e GIDs.';
      case 'bitrix': 
        return 'Usar apenas dados do Bitrix24. Requer integração configurada.';
      case 'hybrid': 
        return 'Combinar dados de ambas as fontes. Melhor cobertura e redundância.';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-bold">Fonte de Dados</h2>
          <p className="text-muted-foreground">
            Escolha de onde o MaxFama deve carregar os dados
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="flex items-center gap-2">
            {getSourceIcon(config.current)}
            Atual: {getSourceLabel(config.current)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Fonte de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={config.current}
            onValueChange={(value: DataSource) => handleSourceChange(value)}
          >
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="sheets" id="sheets" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <Label htmlFor="sheets" className="font-medium">Google Sheets (Padrão)</Label>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSourceDescription('sheets')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="custom-sheets" id="custom-sheets" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <Label htmlFor="custom-sheets" className="font-medium">Google Sheets (Personalizado)</Label>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSourceDescription('custom-sheets')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg opacity-60">
                <RadioGroupItem value="bitrix" id="bitrix" disabled={!config.available.bitrix} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4" />
                    <Label htmlFor="bitrix" className="font-medium">Bitrix24</Label>
                    {config.available.bitrix ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSourceDescription('bitrix')}
                  </p>
                  {!config.available.bitrix && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure a integração Bitrix24 primeiro
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded-lg opacity-60">
                <RadioGroupItem 
                  value="hybrid" 
                  id="hybrid" 
                  disabled={!config.available.bitrix} 
                  className="mt-1" 
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shuffle className="h-4 w-4" />
                    <Label htmlFor="hybrid" className="font-medium">Híbrido (Recomendado)</Label>
                    {config.available.bitrix ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSourceDescription('hybrid')}
                  </p>
                  {!config.available.bitrix && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Requer integração Bitrix24 configurada
                    </p>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {config.current === 'custom-sheets' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuração de Planilha Personalizada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-url">Link da Planilha do Google Sheets</Label>
                  <Input
                    id="custom-url"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={config.customSheets.url}
                    onChange={(e) => handleCustomUrlChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cole o link completo da sua planilha do Google Sheets
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fichas-gid">GID da Aba Fichas</Label>
                    <Input
                      id="fichas-gid"
                      placeholder="452792639"
                      value={config.customSheets.gids.fichas}
                      onChange={(e) => handleGidChange('fichas', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projetos-gid">GID da Aba Projetos</Label>
                    <Input
                      id="projetos-gid"
                      placeholder="449483735"
                      value={config.customSheets.gids.projetos}
                      onChange={(e) => handleGidChange('projetos', e.target.value)}
                    />
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Como encontrar o GID:</strong> Abra sua planilha, clique na aba desejada. 
                    Na URL, o GID é o número após "#gid=". Por exemplo: #gid=123456789
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {config.current === 'hybrid' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Modo Híbrido:</strong> Os dados serão mesclados usando o ID como chave. 
                Em caso de conflito, será priorizado o registro com data de modificação mais recente.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex-1"
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando Conexão...
                </>
              ) : (
                'Testar Conexão'
              )}
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Status das Fontes</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Google Sheets (Padrão)</span>
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Google Sheets (Personalizado)</span>
                <Badge variant="outline" className={config.customSheets.url ? "text-green-600" : "text-muted-foreground"}>
                  {config.customSheets.url ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configurado
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Não configurado
                    </>
                  )}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Bitrix24</span>
                <Badge variant="outline" className="text-muted-foreground">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
