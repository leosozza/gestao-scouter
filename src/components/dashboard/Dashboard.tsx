import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MainNav } from "@/components/main-nav";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { SettingsModal } from "@/components/settings-modal";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "@/components/data-table/columns";
import { google } from "googleapis";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { FichaForm } from "@/components/ficha-form";
import { DateRange } from "react-day-picker";
import { ProjectFilters } from "./ProjectFilters";
import { FinancialControlPanel } from "./FinancialControlPanel";
import { FinancialFilters, FinancialFilterState } from "./FinancialFilters";
import { parseFichaDateTimeBR } from "@/utils/formatters";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedFichas, setSelectedFichas] = useState<Set<string>>(new Set());
  const [data, setData] = useState<{ fichas: any[]; projetos: any[] }>({ fichas: [], projetos: [] });
  const [activeView, setActiveView] = useState<"table" | "financial">("table");
  const [isFichaFormOpen, setIsFichaFormOpen] = useState(false);
  const [filters, setFilters] = useState<FinancialFilterState>({
    dateRange: undefined,
    projeto: '',
    scouter: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const auth = await google.auth.getClient({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Function to fetch data from a specific sheet
      const fetchDataFromSheet = async (spreadsheetId: string, range: string) => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });
        return response.data.values;
      };

      // Fetch Fichas data
      const fichasValues = await fetchDataFromSheet(
        import.meta.env.VITE_SHEET_ID,
        'Fichas!A1:BB'
      );

      // Fetch Projetos data
      const projetosValues = await fetchDataFromSheet(
        import.meta.env.VITE_SHEET_ID,
        'Projetos!A1:Z'
      );

      if (fichasValues && projetosValues) {
        // Process Fichas data
        const [fichasHeaders, ...fichasRows] = fichasValues;
        const fichas = fichasRows.map(row => {
          const ficha: { [key: string]: any } = {};
          fichasHeaders.forEach((header, index) => {
            ficha[header] = row[index] || '';
          });

          // Tenta fazer o parsing da data e hora da ficha
          const parsedDateTime = parseFichaDateTimeBR(ficha['Data de criação da Ficha']);
          if (parsedDateTime) {
            ficha.Criado = parsedDateTime.created_at_iso;
            ficha['Data de criação da Ficha'] = parsedDateTime.created_day;
          }

          return ficha;
        });

        // Process Projetos data
        const [projetosHeaders, ...projetosRows] = projetosValues;
        const projetos = projetosRows.map(row => {
          const projeto: { [key: string]: any } = {};
          projetosHeaders.forEach((header, index) => {
            projeto[header] = row[index] || '';
          });
          return projeto;
        });

        setData({ fichas, projetos });
      } else {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados das planilhas.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message || "Ocorreu um erro ao carregar os dados.",
        variant: "destructive",
      });
      navigate('/login');
      onLogout();
    } finally {
      setIsLoading(false);
    }
  }, [navigate, onLogout, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateFichaPaga = async (fichaIds: string[], status: 'Sim' | 'Não') => {
    setIsLoading(true);
    try {
      const auth = await google.auth.getClient({
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      const sheets = google.sheets({ version: 'v4', auth });

      // Prepare the update request
      const values = fichaIds.map(id => [status]); // Status to update
      const resource = {
        values,
      };

      // Construct the ranges for the update
      const data = fichaIds.map(id => ({
        range: `Fichas!AA${findRowNumberById(id)}`, // Assuming 'Ficha paga' is in column AA
        values: [[status]],
      }));

      // Batch update request
      const batchUpdateData = {
        valueInputOption: 'USER_ENTERED', // or 'RAW'
        data,
      };

      // Make the update request
      const response = await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: import.meta.env.VITE_SHEET_ID,
        requestBody: batchUpdateData,
      });

      if (response.status === 200) {
        toast({
          title: "Fichas atualizadas",
          description: `${fichaIds.length} fichas marcadas como ${status === 'Sim' ? 'pagas' : 'não pagas'}.`,
        });
        fetchData(); // Refresh data
      } else {
        toast({
          title: "Erro ao atualizar fichas",
          description: "Não foi possível atualizar o status das fichas.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating ficha status:", error);
      toast({
        title: "Erro ao atualizar fichas",
        description: error.message || "Ocorreu um erro ao atualizar o status das fichas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const findRowNumberById = (id: string): number => {
    const fichaIndex = data.fichas.findIndex(ficha => ficha.ID === id);
    return fichaIndex !== -1 ? fichaIndex + 2 : -1; // +2 because the data starts on line 2 in the sheet
  };

  const filteredFichas = data.fichas?.filter(ficha => {
    if (filters.dateRange) {
      const fichaDate = new Date(ficha['Data de criação da Ficha']);
      const start = filters.dateRange.from;
      const end = filters.dateRange.to;

      if (!start || !end) {
        return true;
      }

      if (fichaDate < start || fichaDate > end) {
        return false;
      }
    }

    if (filters.projeto && ficha['Projetos Cormeciais'] !== filters.projeto) {
      return false;
    }

    if (filters.scouter && ficha['Gestão de Scouter'] !== filters.scouter) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <MobileSidebar isConfigOpen={isConfigOpen} setIsConfigOpen={setIsConfigOpen} onLogout={onLogout} />
      <Sidebar isConfigOpen={isConfigOpen} setIsConfigOpen={setIsConfigOpen} onLogout={onLogout} />
      <MainNav />

      <SettingsModal
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
      />

      <div className="md:pl-64">
        <div className="mx-auto w-full max-w-screen-2xl space-y-8 p-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                Dashboard
              </h2>
              <div className="flex items-center space-x-2">
                <Button onClick={() => setActiveView(activeView === "table" ? "financial" : "table")}>
                  Trocar para {activeView === "table" ? "Financeiro" : "Tabela"}
                </Button>
                <Button onClick={() => setIsFichaFormOpen(true)}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Adicionar Ficha
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">
              Acompanhe as informações e gerencie as fichas.
            </p>
          </div>

          {activeView === "table" && (
            <div className="space-y-4">
              <ProjectFilters
                projetos={data.projetos || []}
                filters={filters}
                setFilters={setFilters}
              />
              <DataTable columns={columns(setSelectedFichas, selectedFichas, handleUpdateFichaPaga)} data={filteredFichas || []} isLoading={isLoading} />
            </div>
          )}

          {activeView === "financial" && (
            <div className="space-y-6">
              <FinancialControlPanel
                fichas={data.fichas || []}
                projetos={data.projetos || []}
                selectedFichas={selectedFichas}
                onSelectionChange={setSelectedFichas}
                filterType="all"
                filterValue=""
                selectedPeriod={filters.dateRange ? {
                  start: filters.dateRange.from?.toLocaleDateString() || '',
                  end: filters.dateRange.to?.toLocaleDateString() || ''
                } : null}
                filters={filters}
                onUpdateFichaPaga={handleUpdateFichaPaga}
              />
            </div>
          )}

          <FichaForm
            open={isFichaFormOpen}
            onOpenChange={setIsFichaFormOpen}
            onSubmit={() => {
              fetchData();
              setIsFichaFormOpen(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};
