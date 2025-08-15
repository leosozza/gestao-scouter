
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ArrowDown, Download, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { DateRange } from "react-day-picker";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import { FinancialControlPanel } from "./FinancialControlPanel";
import { DailyBreakdownPanel } from "./DailyBreakdownPanel";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [fichas, setFichas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [scouters, setScouters] = useState<string[]>([]);
  const [selectedScouter, setSelectedScouter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>("");
  const [endDate, setEndDate] = useState<string | undefined>("");
  const [filteredFichas, setFilteredFichas] = useState<any[]>([]);
  const [showFinancialControl, setShowFinancialControl] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedFichas = await GoogleSheetsService.fetchFichas();
        setFichas(fetchedFichas || []);

        const fetchedProjetos = await GoogleSheetsService.fetchProjetos();
        setProjetos(fetchedProjetos || []);

        // Extrair lista de scouters únicos
        const uniqueScouters = [...new Set((fetchedFichas || []).map((ficha) => ficha.Gestao_de_Scouter))].filter(Boolean);
        setScouters(["all", ...uniqueScouters]);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        // Definir valores padrão em caso de erro
        setFichas([]);
        setProjetos([]);
        setScouters(["all"]);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (date?.from) {
      setStartDate(format(date.from, "yyyy-MM-dd"));
    } else {
      setStartDate(undefined);
    }

    if (date?.to) {
      setEndDate(format(date.to, "yyyy-MM-dd"));
    } else {
      setEndDate(undefined);
    }
  }, [date]);

  const applyFilters = useCallback(() => {
    let filtered = [...fichas];

    if (selectedScouter !== "all") {
      filtered = filtered.filter((ficha) => ficha.Gestao_de_Scouter === selectedScouter);
    }

    if (selectedProject !== "all") {
      filtered = filtered.filter((ficha) => ficha.Projetos_Comerciais === selectedProject);
    }

    if (startDate && endDate) {
      filtered = filtered.filter((ficha) => {
        const fichaDate = new Date(ficha.Data_de_Criacao_da_Ficha || ficha.Criado);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return fichaDate >= start && fichaDate <= end;
      });
    }

    setFilteredFichas(filtered);
  }, [fichas, selectedScouter, selectedProject, startDate, endDate]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  return (
    <div className="container mx-auto py-10">
      {/* Card de Filtros - sempre visível */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="scouter">Scouter</Label>
            <Select value={selectedScouter} onValueChange={setSelectedScouter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um Scouter" />
              </SelectTrigger>
              <SelectContent>
                {scouters.map((scouter) => (
                  <SelectItem key={scouter} value={scouter}>
                    {scouter === "all" ? "Todos" : scouter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project">Projeto</Label>
            <Input
              type="text"
              id="project"
              placeholder="Nome do Projeto"
              value={selectedProject === "all" ? "" : selectedProject}
              onChange={(e) => setSelectedProject(e.target.value || "all")}
            />
          </div>

          <div>
            <Label>Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      `${format(date.from, "dd/MM/yyyy")} - ${format(date.to, "dd/MM/yyyy")}`
                    ) : (
                      format(date.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione um período</span>
                  )}
                  <ArrowDown className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  pagedNavigation
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Painel de Breakdown Diário - mostra quando há período selecionado */}
      {startDate && endDate && (
        <div className="mt-6">
          <DailyBreakdownPanel
            startDate={startDate}
            endDate={endDate}
            fichas={filteredFichas}
            selectedScouter={selectedScouter}
            selectedProject={selectedProject}
          />
        </div>
      )}

      {/* Botões de Ação */}
      <div className="mt-6 flex gap-4">
        <Button onClick={() => setShowFinancialControl(true)}>
          Controle Financeiro
        </Button>
        <Button variant="outline" onClick={onLogout}>
          Logout
        </Button>
      </div>

      {/* Card de Resumo - sempre visível */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{filteredFichas.length}</div>
                <div className="text-sm text-muted-foreground">Total de Fichas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {scouters.length - 1}
                </div>
                <div className="text-sm text-muted-foreground">Scouters Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {projetos.length}
                </div>
                <div className="text-sm text-muted-foreground">Projetos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  R$ {filteredFichas.reduce((sum, ficha) => sum + (ficha.valor_por_ficha_num || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel de Controle Financeiro - modal */}
      {showFinancialControl && (
        <FinancialControlPanel
          fichas={filteredFichas}
          projetos={projetos}
          onClose={() => setShowFinancialControl(false)}
        />
      )}
    </div>
  );
};
