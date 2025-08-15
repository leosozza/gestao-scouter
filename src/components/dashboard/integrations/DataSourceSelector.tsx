
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  FileSpreadsheet, 
  Shuffle,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DataSource = 'sheets' | 'bitrix' | 'hybrid';

interface DataSourceConfig {
  current: DataSource;
  available: {
    sheets: boolean;
    bitrix: boolean;
  };
}

export const DataSourceSelector = () => {
  const [config, setConfig] = useState<DataSourceConfig>({
    current: 'sheets',
    available: {
      sheets: true,
      bitrix: false,
    },
  });

  const { toast } = useToast();

  useEffect(() => {
    // Carregar configuração salva do localStorage
    const savedSource = localStorage.getItem('maxfama_data_source') as DataSource;
    if (savedSource) {
      setConfig(prev => ({ ...prev, current: savedSource }));
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

  const getSourceLabel = (source: DataSource) => {
    switch (source) {
      case 'sheets': return 'Google Sheets';
      case 'bitrix': return 'Bitrix24';
      case 'hybrid': return 'Híbrido (Sheets + Bitrix)';
    }
  };

  const getSourceIcon = (source: DataSource) => {
    switch (source) {
      case 'sheets': return <FileSpreadsheet className="h-5 w-5" />;
      case 'bitrix': return <Database className="h-5 w-5" />;
      case 'hybrid': return <Shuffle className="h-5 w-5" />;
    }
  };

  const getSourceDescription = (source: DataSource) => {
    switch (source) {
      case 'sheets': 
        return 'Usar apenas dados do Google Sheets. Ideal para começar rapidamente.';
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
        <CardContent className="space-y-4">
          <RadioGroup
            value={config.current}
            onValueChange={(value: DataSource) => handleSourceChange(value)}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 border rounded-lg">
                <RadioGroupItem value="sheets" id="sheets" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <Label htmlFor="sheets" className="font-medium">Google Sheets</Label>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getSourceDescription('sheets')}
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

          {config.current === 'hybrid' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Modo Híbrido:</strong> Os dados serão mesclados usando o ID como chave. 
                Em caso de conflito, será priorizado o registro com data de modificação mais recente.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Status das Fontes</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Google Sheets</span>
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
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
