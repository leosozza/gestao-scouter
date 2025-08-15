
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText } from "lucide-react";
import { FinancialControlPanel } from "./FinancialControlPanel";

interface FinancialData {
  kpis: {
    receitaTotal: number;
    receitaPrevista: number;
    crescimentoMensal: number;
    ticketMedio: number;
  };
  breakdown: Array<{
    categoria: string;
    valor: number;
    percentual: number;
    variacao: number;
  }>;
}

interface FinancialPanelProps {
  data?: FinancialData;
  isLoading?: boolean;
  filters: any;
  availableScouters: string[];
  dashboardData: any;
}

export const FinancialPanel = ({ 
  data, 
  isLoading, 
  filters, 
  availableScouters, 
  dashboardData 
}: FinancialPanelProps) => {
  const [showFinancialControl, setShowFinancialControl] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const mockData: FinancialData = data || {
    kpis: {
      receitaTotal: 15750.50,
      receitaPrevista: 18500.00,
      crescimentoMensal: 12.5,
      ticketMedio: 6.25
    },
    breakdown: [
      { categoria: "Fichas", valor: 12500.00, percentual: 79.4, variacao: 8.5 },
      { categoria: "Ajuda de Custo", valor: 2850.50, percentual: 18.1, variacao: 15.2 },
      { categoria: "Bonificações", valor: 400.00, percentual: 2.5, variacao: -5.3 }
    ]
  };

  return (
    <>
      <div className="space-y-6">
        {/* Botão de Controle Financeiro */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Resumo Financeiro</h3>
          <Button 
            onClick={() => setShowFinancialControl(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Controle Financeiro - Baixa por Scouter
          </Button>
        </div>

        {/* KPIs Financeiros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/20 rounded-full">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                  <p className="text-2xl font-bold">R$ {mockData.kpis.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Prevista</p>
                  <p className="text-2xl font-bold">R$ {mockData.kpis.receitaPrevista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-success/20 rounded-full">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Crescimento Mensal</p>
                  <p className="text-2xl font-bold">+{mockData.kpis.crescimentoMensal}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-warning/20 rounded-full">
                  <DollarSign className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">R$ {mockData.kpis.ticketMedio.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Financeiro */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.breakdown.map((item) => (
                  <TableRow key={item.categoria}>
                    <TableCell className="font-medium">{item.categoria}</TableCell>
                    <TableCell className="text-right">
                      R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{item.percentual}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.variacao >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
                        {item.variacao >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(item.variacao)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal do Controle Financeiro */}
      <FinancialControlPanel
        isOpen={showFinancialControl}
        onClose={() => setShowFinancialControl(false)}
        filters={filters}
        availableScouters={availableScouters}
        data={dashboardData}
      />
    </>
  );
};
