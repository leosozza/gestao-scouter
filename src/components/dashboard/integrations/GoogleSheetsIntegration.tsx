
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { GoogleSheetsService } from "@/services/googleSheetsService";

type DataSource = 'sheets' | 'custom-sheets';

const DEFAULT_SPREADSHEET_ID = "14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o";
const DEFAULT_GIDS = { fichas: "452792639", projetos: "449483735" };

export const GoogleSheetsIntegration = () => {
  const { toast } = useToast();

  const [currentSource, setCurrentSource] = useState<DataSource>("sheets");
  const [isTestingDefault, setIsTestingDefault] = useState(false);
  const [isTestingCustom, setIsTestingCustom] = useState(false);

  const [customUrl, setCustomUrl] = useState("");
  const [customGids, setCustomGids] = useState<{ fichas: string; projetos: string }>(DEFAULT_GIDS);

  // Load saved config
  useEffect(() => {
    const savedSource = (localStorage.getItem("maxfama_data_source") as DataSource) || "sheets";
    const savedUrl = localStorage.getItem("maxfama_custom_sheets_url") || "";
    const savedGids = localStorage.getItem("maxfama_custom_gids");

    setCurrentSource(savedSource);
    setCustomUrl(savedUrl);
    if (savedGids) {
      try {
        const parsed = JSON.parse(savedGids);
        if (parsed?.fichas && parsed?.projetos) {
          setCustomGids(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const defaultSheetLink = useMemo(() => {
    return `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit#gid=${DEFAULT_GIDS.fichas}`;
  }, []);

  const extractSpreadsheetId = (url: string): string | null => {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const csvToJson = (csvText: string): any[] => {
    const lines = csvText.split("\n").filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length > 0) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim().replace(/"/g, "") || "";
        });
        if (Object.values(row).some((v) => v && v.toString().trim() !== "")) {
          data.push(row);
        }
      }
    }
    return data;
  };

  const fetchCustomSheetData = async (spreadsheetId: string, gid: string): Promise<any[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    const csvText = await response.text();
    if (csvText.includes("<!DOCTYPE html>")) {
      throw new Error(`GID ${gid} não encontrado na planilha`);
    }
    return csvToJson(csvText);
  };

  const testDefaultConnection = async () => {
    setIsTestingDefault(true);
    try {
      const [fichas, projetos] = await Promise.all([
        GoogleSheetsService.fetchFichas(),
        GoogleSheetsService.fetchProjetos(),
      ]);
      toast({
        title: "Conexão padrão OK",
        description: `${fichas.length} fichas e ${projetos.length} projetos encontrados`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao conectar (padrão)",
        description:
          error instanceof Error ? error.message : "Falha desconhecida ao acessar a planilha padrão",
        variant: "destructive",
      });
    } finally {
      setIsTestingDefault(false);
    }
  };

  const testCustomConnection = async () => {
    if (!customUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Cole o link da planilha do Google Sheets",
        variant: "destructive",
      });
      return;
    }
    const spreadsheetId = extractSpreadsheetId(customUrl);
    if (!spreadsheetId) {
      toast({
        title: "URL inválida",
        description: "Forneça um link válido de planilha do Google",
        variant: "destructive",
      });
      return;
    }

    setIsTestingCustom(true);
    try {
      const [fichas, projetos] = await Promise.all([
        fetchCustomSheetData(spreadsheetId, customGids.fichas),
        fetchCustomSheetData(spreadsheetId, customGids.projetos),
      ]);
      toast({
        title: "Conexão personalizada OK",
        description: `${fichas.length} fichas e ${projetos.length} projetos encontrados`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao conectar (personalizado)",
        description:
          error instanceof Error ? error.message : "Verifique se a planilha está pública e os GIDs",
        variant: "destructive",
      });
    } finally {
      setIsTestingCustom(false);
    }
  };

  const useDefaultAsSource = () => {
    localStorage.setItem("maxfama_data_source", "sheets");
    setCurrentSource("sheets");
    toast({
      title: "Fonte definida",
      description: "Usando Google Sheets (Padrão)",
    });
  };

  const saveCustomAndUse = () => {
    if (!customUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Cole o link da planilha do Google Sheets",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem("maxfama_data_source", "custom-sheets");
    localStorage.setItem("maxfama_custom_sheets_url", customUrl);
    localStorage.setItem("maxfama_custom_gids", JSON.stringify(customGids));
    setCurrentSource("custom-sheets");
    toast({
      title: "Fonte definida",
      description: "Usando Google Sheets (Personalizado)",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-6 w-6" />
        <div>
          <h2 className="text-xl font-bold">Google Sheets</h2>
          <p className="text-muted-foreground">
            Conecte planilhas públicas do Google Sheets para alimentar o MaxFama
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="flex items-center gap-2">
            {currentSource === "sheets" ? (
              <>
                <CheckCircle className="h-3 w-3 text-success" /> Padrão em uso
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-muted-foreground" /> Personalizado em uso
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planilha Padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <a
                href={defaultSheetLink}
                target="_blank"
                className="underline inline-flex items-center gap-1"
              >
                Abrir planilha padrão
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="mt-1">Spreadsheet ID: {DEFAULT_SPREADSHEET_ID}</p>
            <p>GIDs: fichas {DEFAULT_GIDS.fichas} • projetos {DEFAULT_GIDS.projetos}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={testDefaultConnection} disabled={isTestingDefault} className="flex-1">
              {isTestingDefault ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar conexão"
              )}
            </Button>
            <Button variant="outline" onClick={useDefaultAsSource}>
              Usar como fonte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Personalizado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planilha Personalizada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-url">Link da Planilha</Label>
            <Input
              id="custom-url"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gid-fichas">GID da Aba Fichas</Label>
              <Input
                id="gid-fichas"
                placeholder={DEFAULT_GIDS.fichas}
                value={customGids.fichas}
                onChange={(e) =>
                  setCustomGids((prev) => ({ ...prev, fichas: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gid-projetos">GID da Aba Projetos</Label>
              <Input
                id="gid-projetos"
                placeholder={DEFAULTGIDS.projetos}
                value={customGids.projetos}
                onChange={(e) =>
                  setCustomGids((prev) => ({ ...prev, projetos: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={testCustomConnection} disabled={isTestingCustom} className="flex-1">
              {isTestingCustom ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar conexão"
              )}
            </Button>
            <Button variant="outline" onClick={saveCustomAndUse}>
              Salvar e usar
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Como encontrar o GID: abra a planilha, clique na aba desejada e copie o número após
              #gid= na URL.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleSheetsIntegration;
