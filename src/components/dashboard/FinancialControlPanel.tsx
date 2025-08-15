import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, FileText, Download, AlertTriangle, Check, X, CreditCard, Calendar, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardFilters } from "./FilterPanel";

interface PaymentItem {
  id: string;
  type: 'ficha' | 'ajuda' | 'folga';
  date: string;
  project?: string;
  value: number;
  status: 'PENDENTE' | 'PAGO';
  lote?: string;
  paymentDate?: string;
  isDayOff?: boolean;
  isAbsence?: boolean;
}

interface ProjectValues {
  [projectName: string]: {
    ajudaCustoNormal: number;
    ajudaCustoFolga: number;
    isDistante: boolean;
  };
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
  const [showProjectValues, setShowProjectValues] = useState(false);
  const [projectValues, setProjectValues] = useState<ProjectValues>({});
  const [dayOffDialog, setDayOffDialog] = useState<{ open: boolean; dates: string[] }>({ open: false, dates: [] });
  const [selectedDayOffTypes, setSelectedDayOffTypes] = useState<{ [date: string]: 'folga' | 'falta' }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (selectedScouter && data?.filteredFichas) {
      generatePaymentItems();
    }
  }, [selectedScouter, data, projectValues]);

  const getProjectAjudaValue = (projectName: string, isWorkDay: boolean = true): number => {
    const config = projectValues[projectName];
    if (!config) {
      // Valores padrão: 30 para próximas, 70 para distantes
      return isWorkDay ? 30 : 50;
    }
    return isWorkDay ? config.ajudaCustoNormal : config.ajudaCustoFolga;
  };

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
        status: 'PENDENTE'
      });
    });

    // Calcular ajudas de custo por dia (>20 fichas)
    const fichasPorDia = scouterFichas.reduce((acc: any, ficha: any) => {
      const date = new Date(ficha.Data_de_Criacao_da_Ficha).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, project: ficha.Projetos_Comerciais };
      }
      acc[date].count += 1;
      return acc;
    }, {});

    // Adicionar ajudas de custo para dias trabalhados
    Object.entries(fichasPorDia).forEach(([date, info]: [string, any]) => {
      if (info.count > 20) {
        items.push({
          id: `ajuda-${date}`,
          type: 'ajuda',
          date,
          project: info.project,
          value: getProjectAjudaValue(info.project, true),
          status: 'PENDENTE'
        });
      }
    });

    // Simular dias sem trabalho (para exemplo - em produção viria dos dados)
    const workDates = Object.keys(fichasPorDia);
    const allDatesInRange = generateDateRange(filters.dateRange.start, filters.dateRange.end);
    const nonWorkDays = allDatesInRange.filter(date => !workDates.includes(date));
    
    // Verificar se há dias não trabalhados que podem ser folgas remuneradas
    if (nonWorkDays.length > 0 && !dayOffDialog.open) {
      setDayOffDialog({ open: true, dates: nonWorkDays });
    }

    setPaymentItems(items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const weekday = d.getDay();
      // Apenas dias úteis (segunda a sexta)
      if (weekday >= 1 && weekday <= 5) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const handleDayOffSelection = () => {
    const newItems: PaymentItem[] = [];
    
    Object.entries(selectedDayOffTypes).forEach(([date, type]) => {
      if (type === 'folga') {
        // Buscar o projeto mais recente do scouter para determinar o valor da folga
        const recentFicha = data.filteredFichas
          .filter((f: any) => f.Gestao_de_Scouter === selectedScouter)
          .sort((a: any, b: any) => new Date(b.Data_de_Criacao_da_Ficha).getTime() - new Date(a.Data_de_Criacao_da_Ficha).getTime())[0];
        
        const project = recentFicha?.Projetos_Comerciais || '';
        
        newItems.push({
          id: `folga-${date}`,
          type: 'folga',
          date,
          project,
          value: getProjectAjudaValue(project, false),
          status: 'PENDENTE',
          isDayOff: true
        });
      }
      // Faltas não geram pagamento
    });

    setPaymentItems(prev => [...prev, ...newItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setDayOffDialog({ open: false, dates: [] });
    setSelectedDayOffTypes({});
  };

  const updateProjectValues = (projectName: string, values: Partial<ProjectValues[string]>) => {
    setProjectValues(prev => ({
      ...prev,
      [projectName]: { 
        ajudaCustoNormal: 30,
        ajudaCustoFolga: 50,
        isDistante: false,
        ...prev[projectName], 
        ...values 
      }
    }));
  };

  // Corrigindo a tipagem do availableProjects
  const availableProjects: string[] = data?.filteredFichas 
    ? Array.from(new Set(
        data.filteredFichas
          .map((f: any) => f.Projetos_Comerciais)
          .filter((project): project is string => typeof project === 'string' && project.length > 0)
      ))
    : [];

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
    const paidItems = paymentItems.filter(item => item.status === 'PAGO');
    
    // Fichas
    const fichasPendentes = pendingItems.filter(item => item.type === 'ficha').length;
    const valorFichasPendentes = pendingItems
      .filter(item => item.type === 'ficha')
      .reduce((sum, item) => sum + item.value, 0);
    
    const fichasPagas = paidItems.filter(item => item.type === 'ficha').length;
    const valorFichasPagas = paidItems
      .filter(item => item.type === 'ficha')
      .reduce((sum, item) => sum + item.value, 0);
    
    // Ajuda de custo - dias trabalhados
    const diasAjudaPendente = pendingItems.filter(item => item.type === 'ajuda').length;
    const valorAjudaPendente = pendingItems
      .filter(item => item.type === 'ajuda')
      .reduce((sum, item) => sum + item.value, 0);
      
    const diasAjudaPaga = paidItems.filter(item => item.type === 'ajuda').length;
    const valorAjudaPaga = paidItems
      .filter(item => item.type === 'ajuda')
      .reduce((sum, item) => sum + item.value, 0);

    // Folgas remuneradas
    const folgasPendentes = pendingItems.filter(item => item.type === 'folga').length;
    const valorFolgasPendentes = pendingItems
      .filter(item => item.type === 'folga')
      .reduce((sum, item) => sum + item.value, 0);
      
    const folgasPagas = paidItems.filter(item => item.type === 'folga').length;
    const valorFolgasPagas = paidItems
      .filter(item => item.type === 'folga')
      .reduce((sum, item) => sum + item.value, 0);

    return {
      fichasPendentes,
      valorFichasPendentes,
      diasAjudaPendente,
      valorAjudaPendente,
      folgasPendentes,
      valorFolgasPendentes,
      totalAPagar: valorFichasPendentes + valorAjudaPendente + valorFolgasPendentes,
      
      fichasPagas,
      valorFichasPagas,
      diasAjudaPaga,
      valorAjudaPaga,
      folgasPagas,
      valorFolgasPagas,
      totalPago: valorFichasPagas + valorAjudaPaga + valorFolgasPagas,
      
      totalFichas: fichasPendentes + fichasPagas,
      totalGeral: valorFichasPendentes + valorAjudaPendente + valorFolgasPendentes + valorFichasPagas + valorAjudaPaga + valorFolgasPagas
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowProjectValues(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Valores por Projeto
                </Button>
                <Button variant="ghost" onClick={onClose}>×</Button>
              </div>
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
                    {/* KPIs Detalhados */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Fichas */}
                      <Card className="border-warning">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-warning" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fichas a Pagar</p>
                              <p className="text-xl font-bold text-warning">{totals.fichasPendentes}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-success">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fichas Pagas</p>
                              <p className="text-xl font-bold text-success">{totals.fichasPagas}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-warning">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-warning" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fichas - Valor a Pagar</p>
                              <p className="text-xl font-bold text-warning">R$ {totals.valorFichasPendentes.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-success">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-success" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fichas - Valor Pago</p>
                              <p className="text-xl font-bold text-success">R$ {totals.valorFichasPagas.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Ajuda de Custo */}
                      <Card className="border-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Ajuda Dias a Pagar</p>
                              <p className="text-xl font-bold text-blue-500">{totals.diasAjudaPendente}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Ajuda Dias Pagos</p>
                              <p className="text-xl font-bold text-green-500">{totals.diasAjudaPaga}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Ajuda - Valor a Pagar</p>
                              <p className="text-xl font-bold text-blue-500">R$ {totals.valorAjudaPendente.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-green-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Ajuda - Valor Pago</p>
                              <p className="text-xl font-bold text-green-500">R$ {totals.valorAjudaPaga.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Folgas */}
                      {(totals.folgasPendentes > 0 || totals.folgasPagas > 0) && (
                        <>
                          <Card className="border-purple-500">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-500" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Folgas a Pagar</p>
                                  <p className="text-xl font-bold text-purple-500">{totals.folgasPendentes}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="border-purple-300">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-purple-300" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Folgas - Valor a Pagar</p>
                                  <p className="text-xl font-bold text-purple-300">R$ {totals.valorFolgasPendentes.toFixed(2)}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* Total Geral */}
                      <Card className="border-primary col-span-full md:col-span-2">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Total a Receber</p>
                              <p className="text-2xl font-bold text-primary">R$ {totals.totalAPagar.toFixed(2)}</p>
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
                        {totals.totalAPagar > 0 && (
                          <Button 
                            onClick={() => setConfirmPayment(true)}
                            className="bg-success hover:bg-success/90"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Pagar (R$ {totals.totalAPagar.toFixed(2)})
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
                                  <Badge variant={
                                    item.type === 'ficha' ? 'default' : 
                                    item.type === 'folga' ? 'secondary' : 'outline'
                                  }>
                                    {item.type === 'ficha' ? 'Ficha' : 
                                     item.type === 'folga' ? 'Folga' : 'Ajuda'}
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

      {/* Dialog de Configuração de Valores por Projeto */}
      <Dialog open={showProjectValues} onOpenChange={setShowProjectValues}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Configuração de Valores por Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {availableProjects.map((project) => (
              <Card key={project}>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">{project}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Ajuda de Custo Normal</Label>
                      <Input
                        type="number"
                        value={projectValues[project]?.ajudaCustoNormal || 30}
                        onChange={(e) => updateProjectValues(project, { 
                          ajudaCustoNormal: Number(e.target.value) 
                        })}
                      />
                    </div>
                    <div>
                      <Label>Ajuda de Custo Folga</Label>
                      <Input
                        type="number"
                        value={projectValues[project]?.ajudaCustoFolga || 50}
                        onChange={(e) => updateProjectValues(project, { 
                          ajudaCustoFolga: Number(e.target.value) 
                        })}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox
                        id={`distant-${project}`}
                        checked={projectValues[project]?.isDistante || false}
                        onCheckedChange={(checked) => updateProjectValues(project, { 
                          isDistante: !!checked 
                        })}
                      />
                      <Label htmlFor={`distant-${project}`}>Seletiva Distante (R$ 70)</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Dias Não Trabalhados */}
      <Dialog open={dayOffDialog.open} onOpenChange={(open) => setDayOffDialog({ ...dayOffDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dias Não Trabalhados - {selectedScouter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Foram identificados {dayOffDialog.dates.length} dia(s) útil(is) sem fichas cadastradas. 
              Classifique cada dia como falta ou folga remunerada:
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {dayOffDialog.dates.map(date => (
                <div key={date} className="flex items-center justify-between p-3 border rounded">
                  <span>{new Date(date).toLocaleDateString('pt-BR')}</span>
                  <Select 
                    value={selectedDayOffTypes[date] || ''} 
                    onValueChange={(value: 'folga' | 'falta') => 
                      setSelectedDayOffTypes(prev => ({ ...prev, [date]: value }))
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="folga">Folga Remunerada</SelectItem>
                      <SelectItem value="falta">Falta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleDayOffSelection} className="flex-1">
                Confirmar Classificação
              </Button>
              <Button variant="outline" onClick={() => setDayOffDialog({ open: false, dates: [] })}>
                Pular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              Confirma o pagamento de <strong>R$ {totals.totalAPagar.toFixed(2)}</strong> para{' '}
              <strong>{selectedScouter}</strong>?
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• {totals.fichasPendentes} fichas: R$ {totals.valorFichasPendentes.toFixed(2)}</p>
              <p>• {totals.diasAjudaPendente} dias de ajuda: R$ {totals.valorAjudaPendente.toFixed(2)}</p>
              {totals.folgasPendentes > 0 && (
                <p>• {totals.folgasPendentes} folgas remuneradas: R$ {totals.valorFolgasPendentes.toFixed(2)}</p>
              )}
              <p>• Todos os itens pendentes serão marcados como PAGOS</p>
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
