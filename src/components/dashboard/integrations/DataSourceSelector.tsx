
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Database, Sheet, Globe } from 'lucide-react';
import { getDataSource, setDataSource, type DataSource } from '@/repositories/datasource';
import { useToast } from '@/hooks/use-toast';

export function DataSourceSelector() {
  const [currentSource, setCurrentSource] = useState<DataSource>('sheets');
  const { toast } = useToast();

  useEffect(() => {
    setCurrentSource(getDataSource());
  }, []);

  const handleSourceChange = (newSource: DataSource) => {
    setDataSource(newSource);
    setCurrentSource(newSource);
    
    toast({
      title: "Fonte de dados alterada",
      description: `Agora utilizando ${newSource === 'sheets' ? 'Google Sheets' : 'Bitrix24'} como fonte de dados.`,
    });

    // Refresh the page to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const getSourceIcon = (source: DataSource) => {
    return source === 'sheets' ? <Sheet className="h-4 w-4" /> : <Database className="h-4 w-4" />;
  };

  const getSourceLabel = (source: DataSource) => {
    return source === 'sheets' ? 'Google Sheets' : 'Bitrix24';
  };

  const getConnectionStatus = (source: DataSource) => {
    // Mock connection status - in real implementation, this would check actual connectivity
    return source === 'sheets' ? 'Conectado' : 'Conectado';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Seletor de Fonte de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Fonte atual:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            {getSourceIcon(currentSource)}
            {getSourceLabel(currentSource)}
          </Badge>
        </div>

        <div className="space-y-2">
          <label htmlFor="datasource-select" className="text-sm font-medium">
            Selecionar fonte de dados:
          </label>
          <Select
            value={currentSource}
            onValueChange={(value) => handleSourceChange(value as DataSource)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a fonte de dados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sheets">
                <div className="flex items-center gap-2">
                  <Sheet className="h-4 w-4" />
                  Google Sheets
                </div>
              </SelectItem>
              <SelectItem value="bitrix">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Bitrix24
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h4 className="font-medium text-sm">Status de Conexão</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sheet className="h-4 w-4" />
                Google Sheets
              </div>
              <Badge variant={currentSource === 'sheets' ? 'default' : 'secondary'}>
                {getConnectionStatus('sheets')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Bitrix24
              </div>
              <Badge variant={currentSource === 'bitrix' ? 'default' : 'secondary'}>
                {getConnectionStatus('bitrix')}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
