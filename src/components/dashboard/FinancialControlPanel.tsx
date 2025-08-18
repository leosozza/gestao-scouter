
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/utils/formatters";
import { CalendarDays, DollarSign, FileCheck, FileX, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FinancialControlPanelProps {
  fichas: any[];
  projetos: any[];
  selectedPeriod: { start: string; end: string } | null;
  onUpdateFichaPaga?: (fichaIds: string[], status: 'Sim' | 'Não') => Promise<void>;
}

export const FinancialControlPanel = ({ 
  fichas, 
  projetos, 
  selectedPeriod,
  onUpdateFichaPaga 
}: FinancialControlPanelProps) => {
  const [selectedFichas, setSelectedFichas] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Filtrar fichas por período se selecionado
  const fichasFiltradas = selectedPeriod ? fichas.filter(ficha => {
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

  // Calcular totais baseados na coluna "Ficha paga"
  const fichasPagas = fichasFiltradas.filter(f => f['Ficha paga'] === 'Sim');
  const fichasAPagar = fichasFiltradas.filter(f => f['Ficha paga'] !== 'Sim');
  
  const valorTotalPago = fichasPagas.reduce((total, ficha) => {
    const valor = parseFloat(ficha['Valor por Fichas'] || 0);
    return total + (isNaN(valor) ? 0 : valor);
  }, 0);

  const valorTotalAPagar = fichasAPagar.reduce((total, ficha) => {
    const valor = parseFloat(ficha['Valor por Fichas'] || 0);
    return total + (isNaN(valor) ? 0 : valor);
  }, 0);

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
    const valor = parseFloat(ficha['Valor por Fichas'] || 0);
    const valorValido = isNaN(valor) ? 0 : valor;
    
    if (ficha['Ficha paga'] === 'Sim') {
      acc[scouter].fichasPagas++;
      acc[scouter].valorPago += valorValido;
    } else {
      acc[scouter].fichasAPagar++;
      acc[scouter].valorAPagar += valorValido;
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

  const handleMarcarComoPago = async () => {
    if (selectedFichas.length === 0) {
      toast({
        title: "Nenhuma ficha selecionada",
        description: "Selecione as fichas que deseja marcar como pagas",
        variant: "destructive"
      });
      return;
    }

    if (!onUpdateFichaPaga) {
      toast({
        title: "Função não disponível",
        description: "A atualização de status não está configurada",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateFichaPaga(selectedFichas, 'Sim');
      setSelectedFichas([]);
      
      toast({
        title: "Fichas atualizadas",
        description: `${selectedFichas.length} fichas marcadas como pagas`
      });
    } catch (error) {
      console.error('Erro ao marcar fichas como pagas:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar as fichas",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarcarComoNaoPago = async () => {
    if (selectedFichas.length === 0) {
      toast({
        title: "Nenhuma ficha selecionada",
        description: "Selecione as fichas que deseja marcar como não pagas",
        variant: "destructive"
      });
      return;
    }

    if (!onUpdateFichaPaga) {
      toast({
        title: "Função não disponível",
        description: "A atualização de status não está configurada",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateFichaPaga(selectedFichas, 'Não');
      setSelectedFichas([]);
      
      toast({
        title: "Fichas atualizadas",
        description: `${selectedFichas.length} fichas marcadas como não pagas`
      });
    } catch (error) {
      console.error('Erro ao marcar fichas como não pagas:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar as fichas",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
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
              {selectedPeriod ? 'No período selecionado' : 'Total de fichas'}
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

      {/* Controles de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Controle de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              onClick={handleMarcarComoPago}
              disabled={selectedFichas.length === 0 || isUpdating}
              className="flex items-center gap-2"
            >
              <FileCheck className="h-4 w-4" />
              Marcar como Pago ({selectedFichas.length})
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleMarcarComoNaoPago}
              disabled={selectedFichas.length === 0 || isUpdating}
              className="flex items-center gap-2"
            >
              <FileX className="h-4 w-4" />
              Marcar como Não Pago ({selectedFichas.length})
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setSelectedFichas([])}
              disabled={selectedFichas.length === 0}
            >
              Limpar Seleção
            </Button>
          </div>

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
                      <TableCell>{formatCurrency(parseFloat(ficha['Valor por Fichas'] || 0))}</TableCell>
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
    </div>
  );
};
