import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, parseFichaValue } from "@/utils/formatters";
import { CalendarDays, DollarSign, FileCheck, FileX, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FinancialFilters, FinancialFilterState } from "./FinancialFilters";
import { PaymentBatchActions } from "./PaymentBatchActions";
import { DailyFichasFilter } from "./DailyFichasFilter";
import { CostAllowanceManager } from "./CostAllowanceManager";
import { DatePeriodFilter } from "./DatePeriodFilter";
import { GoogleSheetsUpdateService } from "@/services/googleSheetsUpdateService";

interface FinancialControlPanelProps {
  fichas: any[];
  projetos: any[];
  selectedPeriod?: { start: string; end: string } | null;
  onUpdateFichaPaga?: (fichaIds: string[], status: 'Sim' | 'Não') => Promise<void>;
}

export const FinancialControlPanel = ({ 
  fichas, 
  projetos, 
  selectedPeriod: externalSelectedPeriod,
  onUpdateFichaPaga 
}: FinancialControlPanelProps) => {
  const [selectedFichas, setSelectedFichas] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<{ start: string; end: string } | null>(externalSelectedPeriod || null);
  const [filters, setFilters] = useState<FinancialFilterState>({
    scouter: null,
    projeto: null
  });
  const { toast } = useToast();

  // Filtrar fichas por período se selecionado
  const fichasPorPeriodo = selectedPeriod ? fichas.filter(ficha => {
    const dataCriado = ficha.Criado;
    if (!dataCriado) return false;
    
    let fichaDate;
    if (typeof dataCriado === 'string' && dataCriado.includes('/')) {
      const [day, month, year] = dataCriado.split('/');
      fichaDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      fichaDate = new Date(dataCriado);
    }
    
    const startDate = new Date(selectedPeriod.start);
    const endDate = new Date(selectedPeriod.end + 'T23:59:59');
    
    return fichaDate >= startDate && fichaDate <= endDate;
  }) : fichas;

  // Aplicar filtros adicionais (scouter e projeto)
  const fichasFiltradas = fichasPorPeriodo.filter(ficha => {
    if (filters.scouter && ficha['Gestão de Scouter'] !== filters.scouter) {
      return false;
    }
    if (filters.projeto && ficha['Projetos Cormeciais'] !== filters.projeto) {
      return false;
    }
    return true;
  });

  // DEBUGGING: Log detalhado dos cálculos de valores
  console.log('=== DEBUG FINANCIAL CONTROL PANEL ===');
  console.log('Total fichas recebidas:', fichas.length);
  console.log('Fichas após filtro por período:', fichasPorPeriodo.length);
  console.log('Fichas filtradas final:', fichasFiltradas.length);

  // Calcular totais usando a função padronizada COM LOGS DETALHADOS
  const fichasPagas = fichasFiltradas.filter(f => f['Ficha paga'] === 'Sim');
  const fichasAPagar = fichasFiltradas.filter(f => f['Ficha paga'] !== 'Sim');
  
  console.log('Fichas pagas:', fichasPagas.length);
  console.log('Fichas a pagar:', fichasAPagar.length);

  // ANÁLISE DETALHADA DAS PRIMEIRAS 10 FICHAS A PAGAR
  console.log('=== ANÁLISE DAS PRIMEIRAS 10 FICHAS A PAGAR ===');
  fichasAPagar.slice(0, 10).forEach((ficha, index) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    console.log(`${index + 1}. Ficha ${ficha.ID}:`);
    console.log(`   Status: "${ficha['Ficha paga']}"`);
    console.log(`   Valor original: "${ficha['Valor por Fichas']}"`);
    console.log(`   Valor processado: ${valor}`);
  });

  const valorTotalPago = fichasPagas.reduce((total, ficha) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    return total + valor;
  }, 0);

  const valorTotalAPagar = fichasAPagar.reduce((total, ficha) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    return total + valor;
  }, 0);

  console.log('=== TOTAIS CALCULADOS ===');
  console.log(`Valor total pago: R$ ${valorTotalPago} (${fichasPagas.length} fichas)`);
  console.log(`Valor total a pagar: R$ ${valorTotalAPagar} (${fichasAPagar.length} fichas)`);
  console.log(`Média por ficha a pagar: R$ ${fichasAPagar.length > 0 ? (valorTotalAPagar / fichasAPagar.length).toFixed(2) : 0}`);
  
  // VERIFICAÇÃO DE CONSISTÊNCIA
  if (fichasAPagar.length > 0) {
    const mediaPorFicha = valorTotalAPagar / fichasAPagar.length;
    if (mediaPorFicha < 5 || mediaPorFicha > 7) {
      console.warn('⚠️ INCONSISTÊNCIA DETECTADA: Média por ficha fora do esperado (R$ 6,00)');
      console.warn(`Média calculada: R$ ${mediaPorFicha.toFixed(2)}`);
    }
  }

  // Função melhorada para atualizar fichas com Google Sheets
  const handleUpdateFichaPaga = async (fichaIds: string[], status: 'Sim' | 'Não') => {
    setIsUpdating(true);
    try {
      // Atualizar localmente primeiro (se a função foi fornecida)
      if (onUpdateFichaPaga) {
        await onUpdateFichaPaga(fichaIds, status);
      }
      
      // Atualizar Google Sheets
      toast({
        title: "Atualizando planilha...",
        description: "Sincronizando com Google Sheets",
      });
      
      await GoogleSheetsUpdateService.updateFichaPagaStatus(fichaIds, status);
      
      toast({
        title: "Atualização completa! ✅",
        description: `${fichaIds.length} fichas atualizadas localmente e na planilha do Google Sheets`
      });
      
    } catch (error) {
      console.error('Erro na atualização:', error);
      toast({
        title: "Erro na atualização",
        description: error instanceof Error ? error.message : "Não foi possível completar a atualização",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Agrupar por scouter para relatório de pagamentos
  const pagamentosPorScouter: Record<string, {
    totalFichas: number;
    fichasPagas: number;
    fichasAPagar: number;
    valorPago: number;
    valorAPagar: number;
    diasTrabalhados: Set<string>;
  }> = fichasFiltradas.reduce((acc, ficha) => {
    const scouter = ficha['Gestão de Scouter'] || 'Sem Scouter';
    if (!acc[scouter]) {
      acc[scouter] = {
        totalFichas: 0,
        fichasPagas: 0,
        fichasAPagar: 0,
        valorPago: 0,
        valorAPagar: 0,
        diasTrabalhados: new Set()
      };
    }
    
    acc[scouter].totalFichas++;
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    
    if (ficha['Ficha paga'] === 'Sim') {
      acc[scouter].fichasPagas++;
      acc[scouter].valorPago += valor;
    } else {
      acc[scouter].fichasAPagar++;
      acc[scouter].valorAPagar += valor;
    }
    
    // Adicionar dia trabalhado
    const dataCriado = ficha.Criado;
    if (dataCriado && typeof dataCriado === 'string' && dataCriado.includes('/')) {
      const [day, month, year] = dataCriado.split('/');
      const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      acc[scouter].diasTrabalhados.add(dateKey);
    }
    
    return acc;
  }, {} as Record<string, any>);

  const handleSelectFicha = (fichaId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedFichas([...selectedFichas, fichaId]);
    } else {
      setSelectedFichas(selectedFichas.filter(id => id !== fichaId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allUnpaidIds = fichasAPagar.map(f => f.ID?.toString()).filter(Boolean);
      setSelectedFichas(allUnpaidIds);
    } else {
      setSelectedFichas([]);
    }
  };

  const clearSelection = () => setSelectedFichas([]);

  // Determinar tipo e valor do filtro ativo para exibição
  const getActiveFilterInfo = () => {
    if (filters.scouter) return { type: 'Scouter', value: filters.scouter };
    if (filters.projeto) return { type: 'Projeto', value: filters.projeto };
    return { type: '', value: '' };
  };

  const activeFilter = getActiveFilterInfo();

  return (
    <div className="space-y-6">
      {/* Filtro por Período */}
      <DatePeriodFilter
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Filtros Financeiros */}
      <FinancialFilters
        fichas={fichas}
        projetos={projetos}
        onFiltersChange={setFilters}
      />

      {/* Filtro por Dia */}
      <DailyFichasFilter
        fichas={fichasFiltradas}
        selectedPeriod={selectedPeriod}
      />

      {/* Tabs para separar Fichas e Ajuda de Custo */}
      <Tabs defaultValue="fichas" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fichas">Controle de Fichas</TabsTrigger>
          <TabsTrigger value="ajuda-custo">Ajuda de Custo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fichas" className="space-y-6">
          {/* Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Fichas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fichasFiltradas.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeFilter.type ? `Filtrado por ${activeFilter.type}` : selectedPeriod ? 'No período selecionado' : 'Total de fichas'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fichas Pagas</CardTitle>
                <FileCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{fichasPagas.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(valorTotalPago)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fichas a Pagar</CardTitle>
                <FileX className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{fichasAPagar.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(valorTotalAPagar)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(valorTotalPago + valorTotalAPagar)}</div>
                <p className="text-xs text-muted-foreground">
                  {((valorTotalPago / (valorTotalPago + valorTotalAPagar)) * 100 || 0).toFixed(1)}% pago
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ações de Pagamento em Lote */}
          <PaymentBatchActions
            fichasFiltradas={fichasFiltradas}
            selectedFichas={selectedFichas}
            isUpdating={isUpdating}
            onUpdateFichaPaga={handleUpdateFichaPaga}
            onClearSelection={clearSelection}
            filterType={activeFilter.type}
            filterValue={activeFilter.value}
            projetos={projetos}
            selectedPeriod={selectedPeriod}
            filters={filters}
          />

          {/* Tabela de Controle de Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Fichas a Pagar
                {activeFilter.type && (
                  <Badge variant="outline">
                    {activeFilter.type}: {activeFilter.value}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedFichas.length === fichasAPagar.length && fichasAPagar.length > 0}
                          onCheckedChange={handleSelectAll}
                          disabled={fichasAPagar.length === 0}
                        />
                      </TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Scouter</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fichasAPagar.slice(0, 50).map((ficha) => {
                      const fichaId = ficha.ID?.toString();
                      const isSelected = selectedFichas.includes(fichaId);
                      
                      return (
                        <TableRow key={fichaId}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectFicha(fichaId, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{fichaId}</TableCell>
                          <TableCell>{ficha['Gestão de Scouter'] || 'N/A'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {ficha['Projetos Cormeciais'] || 'N/A'}
                          </TableCell>
                          <TableCell>{ficha.Criado || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(parseFichaValue(ficha['Valor por Fichas'], ficha.ID))}</TableCell>
                          <TableCell>
                            <Badge variant={ficha['Ficha paga'] === 'Sim' ? 'default' : 'secondary'}>
                              {ficha['Ficha paga'] || 'Não'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {fichasAPagar.length > 50 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Mostrando 50 de {fichasAPagar.length} fichas a pagar
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Relatório por Scouter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relatório por Scouter
                {activeFilter.type && (
                  <Badge variant="outline">
                    Filtrado por {activeFilter.type}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(pagamentosPorScouter).map(([scouter, dados]) => (
                  <div key={scouter} className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{scouter}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Fichas:</span>
                        <br />
                        <span className="font-medium">{dados.totalFichas}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fichas Pagas:</span>
                        <br />
                        <span className="font-medium text-green-600">{dados.fichasPagas}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">A Pagar:</span>
                        <br />
                        <span className="font-medium text-orange-600">{dados.fichasAPagar}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Pago:</span>
                        <br />
                        <span className="font-medium text-green-600">{formatCurrency(dados.valorPago)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor a Pagar:</span>
                        <br />
                        <span className="font-medium text-orange-600">{formatCurrency(dados.valorAPagar)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Dias trabalhados: {dados.diasTrabalhados.size}</span>
                      <span>
                        % Pagas: {dados.totalFichas > 0 ? ((dados.fichasPagas / dados.totalFichas) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ajuda-custo">
          <CostAllowanceManager
            fichas={fichasFiltradas}
            projetos={projetos}
            selectedPeriod={selectedPeriod}
            filters={filters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
