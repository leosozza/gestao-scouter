import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sheet, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Upload
} from "lucide-react";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export const GoogleSheetsIntegration = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<{
    total: number;
    synced: number;
    errors: number;
  }>({ total: 0, synced: 0, errors: 0 });

  const syncAllData = async () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus({ total: 0, synced: 0, errors: 0 });

    try {
      toast.info("Iniciando sincronização com Google Sheets...");
      
      // Buscar todos os dados do Google Sheets
      const fichasData = await GoogleSheetsService.fetchFichas();
      
      if (!fichasData || fichasData.length === 0) {
        toast.warning("Nenhuma ficha encontrada na planilha");
        return;
      }

      const total = fichasData.length;
      setSyncStatus(prev => ({ ...prev, total }));
      toast.info(`Encontradas ${total} fichas para sincronizar`);

      // Processar em lotes de 100
      const batchSize = 100;
      let synced = 0;
      let errors = 0;

      for (let i = 0; i < fichasData.length; i += batchSize) {
        const batch = fichasData.slice(i, i + batchSize);
        
        try {
          // Transformar dados para o formato esperado pela edge function
          const rows = batch.map(ficha => ({
            ID: ficha.ID || ficha.id || '',
            'Projetos Comerciais': ficha['Projetos Comerciais'] || ficha.projeto || ficha.projetos || '',
            'Gestão de Scouter': ficha['Gestão de Scouter'] || ficha.scouter || '',
            'Criado': ficha.Criado || ficha.criado || '',
            'Valor por Fichas': ficha['Valor por Fichas'] || ficha.valor_ficha || '',
            'Etapa': ficha.Etapa || ficha.etapa || '',
            'Nome': ficha.Nome || ficha.nome || '',
            'Modelo': ficha.Modelo || ficha.modelo || '',
            'Localização': ficha['Localização'] || ficha.localizacao || '',
            'Ficha Confirmada': ficha['Ficha Confirmada'] || ficha.ficha_confirmada || '',
            'Idade': ficha.Idade || ficha.idade || '',
            'Local da Abordagem': ficha['Local da Abordagem'] || ficha.local_da_abordagem || '',
            'Supervisor do Scouter': ficha['Supervisor do Scouter'] || ficha.supervisor_do_scouter || '',
            'Foto': ficha.Foto || ficha.foto || '',
            'Compareceu': ficha.Compareceu || ficha.compareceu || '',
            'Confirmado': ficha.Confirmado || ficha.confirmado || '',
            'Tabulação': ficha['Tabulação'] || ficha.tabulacao || '',
            'Agendado': ficha.Agendado || ficha.agendado || '',
          }));

          // Chamar edge function para fazer upsert
          const { error } = await supabase.functions.invoke('sheets-upsert', {
            body: { rows }
          });

          if (error) {
            console.error('Erro ao sincronizar lote:', error);
            errors += batch.length;
          } else {
            synced += batch.length;
          }
        } catch (error) {
          console.error('Erro ao processar lote:', error);
          errors += batch.length;
        }

        // Atualizar progresso
        const progress = Math.round(((i + batch.length) / total) * 100);
        setSyncProgress(progress);
        setSyncStatus({ total, synced, errors });
      }

      if (errors === 0) {
        toast.success(`Sincronização completa! ${synced} fichas sincronizadas.`);
      } else {
        toast.warning(`Sincronização completa com erros. ${synced} sincronizadas, ${errors} erros.`);
      }

    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error("Erro ao sincronizar dados: " + error.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const testConnection = async () => {
    try {
      toast.info("Testando conexão com Google Sheets...");
      const result = await GoogleSheetsService.testConnection();
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Erro ao testar conexão: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sheet className="h-6 w-6" />
            <div>
              <CardTitle>Sincronização Google Sheets → Supabase</CardTitle>
              <CardDescription>
                Sincronize todos os dados da planilha Google Sheets para o banco de dados Supabase
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Esta integração busca todos os dados da planilha pública e sincroniza com o Supabase.
              Os dados são processados em lotes para melhor performance.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sheet className="h-5 w-5 text-primary" />
                <span className="font-medium">Fonte</span>
              </div>
              <p className="text-sm text-muted-foreground">Google Sheets</p>
              <Badge variant="outline" className="mt-2">Planilha Pública</Badge>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="font-medium">Destino</span>
              </div>
              <p className="text-sm text-muted-foreground">Supabase</p>
              <Badge variant="outline" className="mt-2">Tabela: fichas</Badge>
            </div>
          </div>

          {isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso da sincronização</span>
                <span className="font-medium">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total: {syncStatus.total}</span>
                <span className="text-success">Sincronizadas: {syncStatus.synced}</span>
                {syncStatus.errors > 0 && (
                  <span className="text-destructive">Erros: {syncStatus.errors}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={syncAllData} 
              disabled={isSyncing}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Sincronizar Todos os Dados
                </>
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={testConnection}
              disabled={isSyncing}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Testar Conexão
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta operação irá sobrescrever os dados existentes no Supabase 
              com os dados da planilha. Use com cuidado!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações da Planilha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Planilha ID</p>
              <p className="text-sm text-muted-foreground font-mono">
                14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a 
                href="https://docs.google.com/spreadsheets/d/14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium mb-1">Aba: Fichas</p>
              <p className="text-xs text-muted-foreground">GID: 452792639</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium mb-1">Aba: Projetos</p>
              <p className="text-xs text-muted-foreground">GID: 449483735</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};