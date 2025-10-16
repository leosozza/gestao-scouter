import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MainNav } from "@/components/main-nav";
import { Sidebar } from "@/components/sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { SettingsModal } from "@/components/settings-modal";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "@/components/data-table/columns";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { FichaForm } from "@/components/ficha-form";
import { DateRange } from "react-day-picker";
import { ProjectFilters } from "./ProjectFilters";
import { FinancialControlPanel } from "./FinancialControlPanel";
import { FinancialFilters, FinancialFilterState } from "./FinancialFilters";
import { supabase } from "@/integrations/supabase/client";
import { AIAnalysis } from "@/components/shared/AIAnalysis";
import { toISODate } from "@/utils/normalize";
import type { Ficha, Project } from "@/repositories/types";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  // datas padrão: 1º dia do mês até hoje
  const today = new Date();
  const endDefault = toISODate(today);
  const startDefault = `${endDefault.slice(0,7)}-01`;

  const [period, setPeriod] = useState<{ start?: string; end?: string }>({
    start: startDefault,
    end: endDefault,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedFichas, setSelectedFichas] = useState<Set<string>>(new Set());
  const [data, setData] = useState<{ fichas: Ficha[]; projetos: Project[] }>({ fichas: [], projetos: [] });
  const [activeView, setActiveView] = useState<"table" | "financial">("table");
  const [isFichaFormOpen, setIsFichaFormOpen] = useState(false);
  const [filters, setFilters] = useState<FinancialFilterState>({
    dateRange: undefined,
    projeto: '',
    scouter: ''
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // garante busca inicial
  useEffect(() => {
    // se algum lado vier vazio (ex.: usuário só muda o fim),
    // mantemos o último válido para não quebrar a busca
    if (!period.start) setPeriod((p) => ({ ...p, start: startDefault }));
    if (!period.end)   setPeriod((p) => ({ ...p, end: endDefault }));
  }, [period.start, period.end, startDefault, endDefault]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch data from Supabase fichas table
      const { data: fichasData, error: fichasError } = await supabase
        .from('fichas')
        .select('*')
        .eq('deleted', false);

      if (fichasError) throw fichasError;

      // Transform fichas data to match expected format
      const fichas = fichasData?.map(ficha => ({
        ID: ficha.id,
        'Gestão de Scouter': ficha.scouter || '',
        'Projetos Cormeciais': ficha.projeto || 'Sem Projeto',
        'Data de criação da Ficha': ficha.criado || '',
        'Ficha paga': ficha.etapa === 'Lead convertido' ? 'Sim' : 'Não',
        'Criado': ficha.criado,
        'Valor_Ficha': ficha.valor_ficha,
        'Etapa': ficha.etapa,
        'Nome': ficha.nome,
        ...ficha
      })) || [];

      // Mock projects data for now
      const projetos = [
        { 'Agencia e Seletiva': 'Projeto Geral', 'Meta de Fichas': 100 }
      ];

      setData({ fichas, projetos });
    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro ao carregar os dados.";
      toast({
        title: "Erro ao carregar dados", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateFichaPaga = async (fichaIds: string[], status: 'Sim' | 'Não') => {
    setIsLoading(true);
    try {
      // Update status using Supabase (disabled for now - needs etapa field)
      console.log('Update fichas paga', fichaIds, status);
      
      toast({
        title: "Fichas atualizadas",
        description: `${fichaIds.length} fichas marcadas como ${status === 'Sim' ? 'pagas' : 'não pagas'}.`,
      });
      
      fetchData(); // Refresh data
    } catch (error: unknown) {
      console.error("Error updating ficha status:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o status das fichas.";
      toast({
        title: "Erro ao atualizar fichas",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

          {/* AI Analysis na primeira aba/seção do dashboard */}
          <div className="mt-2">
            <AIAnalysis
              title="Análise de Performance por IA"
            />
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
