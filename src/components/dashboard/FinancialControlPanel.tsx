import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, Calendar } from "lucide-react";
import { PaymentBatchActions } from "./PaymentBatchActions";
import { PaymentSummary } from "./PaymentSummary";
import { CostAllowanceManager } from "./CostAllowanceManager";
import { formatCurrency, parseFichaValue } from "@/utils/formatters";
import { FinancialFilterState } from "./FinancialFilters";

interface FinancialControlPanelProps {
  fichasFiltradas: any[];
  projetos: any[];
  selectedFichas: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  filterType: string;
  filterValue: string;
  selectedPeriod?: { start: string; end: string } | null;
  filters: FinancialFilterState;
}

export const FinancialControlPanel = ({
  fichasFiltradas,
  projetos,
  selectedFichas,
  onSelectionChange,
  filterType,
  filterValue,
  selectedPeriod,
  filters
}: FinancialControlPanelProps) => {
  const [activeTab, setActiveTab] = useState("fichas");

  const fichasPagas = fichasFiltradas.filter(f => f['Ficha paga'] === 'Sim');
  const fichasAPagar = fichasFiltradas.filter(f => f['Ficha paga'] !== 'Sim');
  
  const valorTotalFichasPagas = fichasPagas.reduce((total, ficha) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    return total + valor;
  }, 0);

  const valorTotalFichasAPagar = fichasAPagar.reduce((total, ficha) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    return total + valor;
  }, 0);

  const valorTotalSelecionadas = useMemo(() => {
    return fichasFiltradas
      .filter(f => selectedFichas.has(f.ID?.toString()))
      .reduce((total, ficha) => {
        const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
        return total + valor;
      }, 0);
  }, [fichasFiltradas, selectedFichas]);

  console.log("=== DEBUG FINANCIAL CONTROL PANEL ===");
  console.log("Total fichas recebidas:", fichasFiltradas.length);
  console.log("Fichas após filtro por período:", fichasFiltradas.length);
  console.log("Fichas filtradas final:", fichasFiltradas.length);
  console.log("Fichas pagas:", fichasPagas.length);
  console.log("Fichas a pagar:", fichasAPagar.length);

  console.log("=== ANÁLISE DAS PRIMEIRAS 10 FICHAS A PAGAR ===");
  fichasAPagar.slice(0, 10).forEach((ficha, index) => {
    const valorProcessado = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    console.log(`${index + 1}. Ficha ${ficha.ID}:`);
    console.log(`   Status: "${ficha['Ficha paga']}"`);
    console.log(`   Valor original: "${ficha['Valor por Fichas']}"`);
    console.log(`   Valor processado: ${valorProcessado}`);
  });

  return (
    <div className="space-y-6">
      {/* Payment Summary - Always visible */}
      <PaymentSummary 
        fichasFiltradas={fichasFiltradas}
        filterType={filterType}
        filterValue={filterValue}
        projetos={projetos}
        selectedPeriod={selectedPeriod}
        filters={filters}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Fichas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fichasFiltradas.length}</div>
            <p className="text-xs text-muted-foreground">
              fichas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichas Pagas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fichasPagas.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(valorTotalFichasPagas)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichas a Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{fichasAPagar.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(valorTotalFichasAPagar)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selecionadas</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedFichas.size}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(valorTotalSelecionadas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fichas">Controle de Fichas</TabsTrigger>
          <TabsTrigger value="ajuda-custo">Ajuda de Custo</TabsTrigger>
        </TabsList>

        <TabsContent value="fichas" className="space-y-4">
          <PaymentBatchActions
            selectedFichas={selectedFichas}
            fichasAPagar={fichasAPagar}
            onSelectionChange={onSelectionChange}
            filterType={filterType}
            filterValue={filterValue}
            projetos={projetos}
            selectedPeriod={selectedPeriod}
            filters={filters}
          />
        </TabsContent>

        <TabsContent value="ajuda-custo" className="space-y-4">
          <CostAllowanceManager
            projetos={projetos}
            fichasFiltradas={fichasFiltradas}
            selectedPeriod={selectedPeriod}
            filters={filters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
