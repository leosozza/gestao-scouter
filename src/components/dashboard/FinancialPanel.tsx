
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  PieChart,
  BarChart,
  Calendar,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const FinancialPanel = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const { toast } = useToast();

  const mockFinancialData = {
    revenue: 125000,
    expenses: 75000,
    profit: 50000,
    profitMargin: 40,
    leads: 1250,
    avgTicket: 100,
    conversionRate: 15.5
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Controle Financeiro
          </h1>
          <p className="text-muted-foreground">
            Acompanhe receitas, despesas e métricas financeiras
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Período
          </Button>
        </div>
      </div>

      <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <TabsList>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
          <TabsTrigger value="quarter">Trimestre</TabsTrigger>
          <TabsTrigger value="year">Ano</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-6">
          {/* KPIs Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(mockFinancialData.revenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12.5% vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(mockFinancialData.expenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  -3.2% vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <Calculator className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(mockFinancialData.profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margem: {mockFinancialData.profitMargin}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <PieChart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(mockFinancialData.avgTicket)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Taxa conversão: {mockFinancialData.conversionRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Análises */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Receita</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded">
                  <div className="text-center">
                    <BarChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Gráfico de receita será implementado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/30 rounded">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Gráfico de despesas será implementado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Transações Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 1, type: 'receita', description: 'Pagamento Lead #1234', value: 500, date: '2024-01-15' },
                  { id: 2, type: 'despesa', description: 'Ajuda de Custo - João', value: -150, date: '2024-01-15' },
                  { id: 3, type: 'receita', description: 'Pagamento Lead #1235', value: 300, date: '2024-01-14' },
                  { id: 4, type: 'despesa', description: 'Comissão - Maria', value: -250, date: '2024-01-14' },
                ].map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={transaction.type === 'receita' ? 'default' : 'secondary'}>
                        {transaction.type}
                      </Badge>
                      <span className={`font-bold ${transaction.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(transaction.value))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
