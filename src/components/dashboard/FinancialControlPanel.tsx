
// Mesmo ajuste visual: formatBRL na ponta, nada de converter string->number na UI.
import { formatBRL } from '@/utils/currency';
import { getValorFichaFromRow } from '@/utils/values';
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, TrendingUp, Calendar } from "lucide-react";
import { PaymentBatchActions } from "./PaymentBatchActions";
import { PaymentSummary } from "./PaymentSummary";
import { CostAllowanceManager } from "./CostAllowanceManager";
import { FinancialFilterState } from "./FinancialFilters";
import type { Ficha, Project } from "@/repositories/types";

interface FinancialControlPanelProps {
  fichasFiltradas?: Ficha[];
  fichas?: Ficha[]; // Add this to support the prop from Dashboard
  projetos: Project[];
  selectedFichas: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  filterType: string;
  filterValue: string;
  selectedPeriod?: { start: string; end: string } | null;
  filters?: FinancialFilterState;
  onUpdateFichaPaga?: (fichaIds: string[], status: 'Sim' | 'Não') => Promise<void>;
}

export const FinancialControlPanel = ({
  fichasFiltradas,
  fichas, // Accept both props
  projetos = [],
  selectedFichas,
  onSelectionChange,
  filterType,
  filterValue,
  selectedPeriod,
  filters,
  onUpdateFichaPaga
}: FinancialControlPanelProps) => {
  const [activeTab, setActiveTab] = useState("fichas");

  // Use fichasFiltradas if available, otherwise use fichas, otherwise empty array
  const fichasData = fichasFiltradas || fichas || [];

  // Safely filter fichas with null checks
  const fichasPagas = fichasData?.filter(f => f && f['Ficha paga'] === 'Sim') || [];
  const fichasAPagar = fichasData?.filter(f => f && f['Ficha paga'] !== 'Sim') || [];
  
  const valorTotalFichasPagas = fichasPagas.reduce((total, ficha) => {
    const valor = getValorFichaFromRow(ficha);
    return total + valor;
  }, 0);

  const valorTotalFichasAPagar = fichasAPagar.reduce((total, ficha) => {
    const valor = getValorFichaFromRow(ficha);
    return total + valor;
  }, 0);

  const valorTotalSelecionadas = useMemo(() => {
    if (!fichasData || !selectedFichas) return 0;
    
    return fichasData
      .filter(f => f && selectedFichas.has(f.ID?.toString()))
      .reduce((total, ficha) => {
        const valor = getValorFichaFromRow(ficha);
        return total + valor;
      }, 0);
  }, [fichasData, selectedFichas]);

  // Convert Set to Array for PaymentBatchActions
  const selectedFichasArray = Array.from(selectedFichas || []);

  const handleClearSelection = () => {
    onSelectionChange(new Set<string>());
  };

  console.log("=== DEBUG FINANCIAL CONTROL PANEL ===");
  console.log("Total fichas recebidas:", fichasData?.length || 0);
  console.log("Fichas pagas:", fichasPagas.length);
  console.log("Fichas a pagar:", fichasAPagar.length);

  return (
    <div className="space-y-6">
      {/* Payment Summary - Always visible */}
      <PaymentSummary 
        fichasFiltradas={fichasData}
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
            <div className="text-2xl font-bold">{fichasData?.length || 0}</div>
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
              {formatBRL(valorTotalFichasPagas)}
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
              {formatBRL(valorTotalFichasAPagar)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selecionadas</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedFichas?.size || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatBRL(valorTotalSelecionadas)}
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
            fichasFiltradas={fichasData}
            selectedFichas={selectedFichasArray}
            isUpdating={false}
            onUpdateFichaPaga={onUpdateFichaPaga}
            onClearSelection={handleClearSelection}
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
            fichas={fichasData}
            selectedPeriod={selectedPeriod}
            filters={filters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
