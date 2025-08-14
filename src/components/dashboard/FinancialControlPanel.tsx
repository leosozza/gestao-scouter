
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, FileText, Download, AlertTriangle, Check, X, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardFilters } from "./FilterPanel";

interface PaymentItem {
  id: string;
  type: 'ficha' | 'ajuda';
  date: string;
  project?: string;
  value: number;
  status: 'PENDENTE' | 'PAGO';
  lote?: string;
  paymentDate?: string;
}

interface FinancialControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DashboardFilters;
  availableScouters: string[];
  data: any;
}

export const FinancialControlPanel = ({ 
  isOpen, 
  onClose, 
  filters, 
  availableScouters,
  data 
}: FinancialControlPanelProps) => {
  const [selectedScouter, setSelectedScouter] = useState<string>("");
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [confirmPayment, setConfirmPayment] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedScouter && data?.filteredFichas) {
      generatePaymentItems();
    }
  }, [selectedScouter, data]);

  const generatePaymentItems = () => {
    if (!selectedScouter || !data?.filteredFichas) return;

    const scouterFichas = data.filteredFichas.filter(
      (ficha: any) => ficha.Gestao_de_Scouter === selectedScouter
    );

    const items: PaymentItem[] = [];

    // Adicionar fichas
    scouterFichas.forEach((ficha: any) => {
      items.push({
        id: `ficha-${ficha.ID}`,
        type: 'ficha',
        date: ficha.Data_de_Criacao_da_Ficha,
        project: ficha.Projetos_Comerciais,
        value: ficha.valor_por_ficha_num || 2.5,
        status: 'PENDENTE' // Simular status
      });
    });

    // Calcular ajudas de custo por dia (>20 fichas)
    const fichasPorDia = scouterFichas.reduce((acc: any, ficha: any) => {
      const date = new Date(ficha.Data_de_Criacao_da_Ficha).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    Object.entries(fichasPorDia).forEach(([date, count]) => {
      if ((count as number) > 20) {
        items.push({
          id: `ajuda-${date}`,
          type: 'ajuda',
          date,
          value: 30,
          status: 'PENDENTE'
        });
      }
    });

    setPaymentItems(items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const getFilteredItems = () => {
    switch (filterStatus) {
      case 'pending':
        return paymentItems.filter(item => item.status === 'PENDENTE');
      case 'paid':
        return paymentItems.filter(item => item.status === 'PAGO');
      default:
        return paymentItems;
    }
  };

  const calculateTotals = () => {
    const pendingItems = paymentItems.filter(item => item.status === 'PENDENTE');
    const totalFichas = pendingItems.filter(item => item.type === 'ficha').length;
    const valorFichas = pendingItems
      .filter(item => item.type === 'ficha')
      .reduce((sum, item) => sum + item.value, 0);
    const diasAjuda = pendingItems.filter(item => item.type === 'ajuda').length;
    const valorAjuda = pendingItems
      .filter(item => item.type === 'ajuda')
      .reduce((sum, item) => sum + item.value, 0);

    return {
      totalFichas,
      valorFichas,
      diasAjuda,
      valorAjuda,
      totalGeral: valorFichas + valorAjuda
    };
  };

  const handlePayment = () => {
    if (!selectedScouter) return;

    const loteId = crypto.randomUUID();
    const paymentDate = new Date().toISOString();

    setPaymentItems(prev => prev.map(item => 
      item.status === 'PENDENTE' 
        ? { ...item, status: 'PAGO' as const, lote: loteId, paymentDate }
        : item
    ));

    // Simular persistência no Google Sheets
    console.log('Pagamento processado:', {
      scouter: selectedScouter,
      lote: loteId,
      data: paymentDate,
      items: paymentItems.filter(item => item.status === 'PENDENTE')
    });

    toast({
      title: "Pagamento processado",
      description: `Lote ${loteId.slice(0, 8)} gerado com sucesso`,
      variant: "default"
    });

    setConfirmPayment(false);
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    const totals = calculateTotals();
    const reportData = {
      scouter: selectedScouter,
      periodo: `${filters.dateRange.start} a ${filters.dateRange.end}`,
      ...totals,
      items: getFilteredItems()
    };

    console.log(`Exportando relatório ${format.toUpperCase()}:`, reportData);
    
    toast({
      title: `Relatório ${format.toUpperCase()}`,
      description: `Relatório de ${selectedScouter} está sendo preparado`
    });
  };

  if (!isOpen) return null;

  const totals = calculateTotals();
  const filteredItems = getFilteredItems();

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-6xl max-h-[90vh] overflow-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Controle Financeiro - Baixa por Scouter
              </CardTitle>
              <Button variant="ghost" onClick={onClose}>×</Button>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                {/* Seleção de Scouter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Scouter (obrigatório)</label>
                  <Select value={selectedScouter} onValueChange={setSelectedScouter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um scouter para continuar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableScouters.map(scouter => (
                        <SelectItem key={scouter} value={scouter}>
                          {scouter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedScouter && (
                  <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fichas Pendentes</p>
                              <p className="text-xl font-bold">{totals.totalFichas}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-xs text-muted-foreground">Valor por Fichas</p>
                              <p className="text-xl font-bold">R$ {totals.valorFichas.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-warning" />
                            <div>
                              <p className="text-xs text-muted-foreground">Dias com Ajuda</p>
                              <p className="text-xl font-bold">{totals.diasAjuda}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-warning" />
                            <div>
                              <p className="text-xs text-muted-foreground">Ajuda de Custo</p>
                              <p className="text-xl font-bold">R$ {totals.valorAjuda.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-primary">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Total a Receber</p>
                              <p className="text-xl font-bold text-primary">R$ {totals.totalGeral.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Filtros e Ações */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="paid">Pagos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => exportReport('csv')}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          CSV
                        </Button>
                        <Button 
                          onClick={() => exportReport('pdf')}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        {totals.totalGeral > 0 && (
                          <Button 
                            onClick={() => setConfirmPayment(true)}
                            className="bg-success hover:bg-success/90"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Pagar (R$ {totals.totalGeral.toFixed(2)})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tabela de Itens */}
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Projeto</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Lote</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Badge variant={item.type === 'ficha' ? 'default' : 'secondary'}>
                                    {item.type === 'ficha' ? 'Ficha' : 'Ajuda'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(item.date).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>{item.project || '-'}</TableCell>
                                <TableCell>R$ {item.value.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={item.status === 'PAGO' ? 'default' : 'secondary'}>
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {item.lote ? item.lote.slice(0, 8) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={confirmPayment} onOpenChange={setConfirmPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirmar Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Confirma o pagamento de <strong>R$ {totals.totalGeral.toFixed(2)}</strong> para{' '}
              <strong>{selectedScouter}</strong>?
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {totals.totalFichas} fichas: R$ {totals.valorFichas.toFixed(2)}</p>
              <p>• {totals.diasAjuda} dias de ajuda: R$ {totals.valorAjuda.toFixed(2)}</p>
              <p>• Todas as fichas pendentes serão marcadas como PAGAS</p>
              <p>• Um lote de pagamento será gerado para controle</p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handlePayment} className="flex-1">
                Confirmar Pagamento
              </Button>
              <Button variant="outline" onClick={() => setConfirmPayment(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
