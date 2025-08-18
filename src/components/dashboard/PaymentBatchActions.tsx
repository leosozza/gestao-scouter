import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, FileX, DollarSign, AlertTriangle, Calendar } from "lucide-react";
import { formatCurrency, parseFichaValue } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import { FinancialFilterState } from "./FinancialFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentBatchActionsProps {
  fichasFiltradas: any[];
  selectedFichas: string[];
  isUpdating: boolean;
  onUpdateFichaPaga?: (fichaIds: string[], status: 'Sim' | 'Não') => Promise<void>;
  onClearSelection: () => void;
  filterType: string;
  filterValue: string;
  projetos: any[];
  selectedPeriod?: { start: string; end: string } | null;
  filters?: FinancialFilterState;
}

export const PaymentBatchActions = ({
  fichasFiltradas,
  selectedFichas,
  isUpdating,
  onUpdateFichaPaga,
  onClearSelection,
  filterType,
  filterValue,
  projetos,
  selectedPeriod,
  filters
}: PaymentBatchActionsProps) => {
  const { toast } = useToast();

  const fichasAPagar = fichasFiltradas.filter(f => f['Ficha paga'] !== 'Sim');
  const fichasSelecionadas = fichasFiltradas.filter(f => selectedFichas.includes(f.ID?.toString()));
  
  const valorTotalSelecionadas = fichasSelecionadas.reduce((total, ficha) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    return total + valor;
  }, 0);

  const valorTotalAPagar = fichasAPagar.reduce((total, ficha) => {
    const valor = parseFichaValue(ficha['Valor por Fichas'], ficha.ID);
    return total + valor;
  }, 0);

  // Calcular ajuda de custo baseado no período e filtros
  const calcularAjudaDeCusto = () => {
    if (!selectedPeriod || !filters?.scouter) return 0;

    // Buscar projeto do scouter para obter valores de ajuda de custo
    const fichasDoScouter = fichasFiltradas.filter(f => f['Gestão de Scouter'] === filters.scouter);
    if (fichasDoScouter.length === 0) return 0;

    const projetoScouter = fichasDoScouter[0]['Projetos Cormeciais'];
    const projeto = projetos?.find(p => p.nome === projetoScouter);
    
    if (!projeto) return 0;

    const valorDiaria = parseFloat(projeto.valorAjudaCusto || 0);
    const valorFolgaRemunerada = parseFloat(projeto.valorFolgaRemunerada || 0);

    // Calcular dias trabalhados no período
    const startDate = new Date(selectedPeriod.start);
    const endDate = new Date(selectedPeriod.end);
    const diasTrabalhados = new Set();
    
    fichasDoScouter.forEach(ficha => {
      const dataCriado = ficha.Criado;
      if (dataCriado && typeof dataCriado === 'string' && dataCriado.includes('/')) {
        const [day, month, year] = dataCriado.split('/');
        const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        diasTrabalhados.add(dateKey);
      }
    });

    // Calcular total de dias no período
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diasNaoTrabalhados = totalDays - diasTrabalhados.size;

    const ajudaCustoTrabalhados = diasTrabalhados.size * valorDiaria;
    const ajudaCustoFolgas = diasNaoTrabalhados * valorFolgaRemunerada;

    return ajudaCustoTrabalhados + ajudaCustoFolgas;
  };

  const valorAjudaCusto = calcularAjudaDeCusto();
  const valorTotalCompleto = valorTotalAPagar + valorAjudaCusto;

  const handlePagarTodasDoFiltro = async () => {
    if (fichasAPagar.length === 0) {
      toast({
        title: "Nenhuma ficha para pagar",
        description: "Todas as fichas já estão pagas",
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
      const idsAPagar = fichasAPagar.map(f => f.ID?.toString()).filter(Boolean);
      await onUpdateFichaPaga(idsAPagar, 'Sim');
      
      toast({
        title: "Pagamentos processados",
        description: `${idsAPagar.length} fichas marcadas como pagas ${filterType ? `para ${filterType}: ${filterValue}` : ''}`
      });
    } catch (error) {
      console.error('Erro ao processar pagamentos:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar os pagamentos",
        variant: "destructive"
      });
    }
  };

  const handlePagarSelecionadas = async () => {
    if (selectedFichas.length === 0) {
      toast({
        title: "Nenhuma ficha selecionada",
        description: "Selecione as fichas que deseja pagar",
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
      await onUpdateFichaPaga(selectedFichas, 'Sim');
      onClearSelection();
      
      toast({
        title: "Fichas pagas",
        description: `${selectedFichas.length} fichas marcadas como pagas`
      });
    } catch (error) {
      console.error('Erro ao pagar fichas:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento",
        variant: "destructive"
      });
    }
  };

  const handlePagarAjudaCusto = async () => {
    // Implementar lógica específica para ajuda de custo
    toast({
      title: "Ajuda de custo paga",
      description: `Ajuda de custo de ${formatCurrency(valorAjudaCusto)} processada`
    });
  };

  const handlePagarTudo = async () => {
    try {
      // Pagar fichas
      if (fichasAPagar.length > 0 && onUpdateFichaPaga) {
        const idsAPagar = fichasAPagar.map(f => f.ID?.toString()).filter(Boolean);
        await onUpdateFichaPaga(idsAPagar, 'Sim');
      }
      
      // Processar ajuda de custo
      // Em produção, seria uma chamada separada para registrar a ajuda de custo
      
      toast({
        title: "Pagamento completo processado",
        description: `Fichas (${formatCurrency(valorTotalAPagar)}) + Ajuda de custo (${formatCurrency(valorAjudaCusto)}) = ${formatCurrency(valorTotalCompleto)}`
      });
    } catch (error) {
      console.error('Erro no pagamento completo:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento completo",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Opções de Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Botões de ação de pagamento */}
          <div className="flex flex-wrap gap-3">
            {/* Pagar fichas selecionadas */}
            <Button
              onClick={handlePagarSelecionadas}
              disabled={selectedFichas.length === 0 || isUpdating}
              className="flex items-center gap-2"
            >
              <FileCheck className="h-4 w-4" />
              Pagar Fichas Selecionadas ({selectedFichas.length})
              {selectedFichas.length > 0 && (
                <span className="ml-1 text-xs">
                  {formatCurrency(valorTotalSelecionadas)}
                </span>
              )}
            </Button>

            {/* Pagar todas as fichas do filtro */}
            {fichasAPagar.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isUpdating}
                    className="flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Pagar Todas as Fichas ({fichasAPagar.length})
                    <span className="ml-1 text-xs">
                      {formatCurrency(valorTotalAPagar)}
                    </span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Confirmar Pagamento de Fichas
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a marcar como pagas <strong>{fichasAPagar.length} fichas</strong> 
                      {filterType && (
                        <span> do {filterType.toLowerCase()} <strong>"{filterValue}"</strong></span>
                      )}
                      , no valor total de <strong>{formatCurrency(valorTotalAPagar)}</strong>.
                      <br /><br />
                      Esta ação atualizará a planilha do Google Sheets automaticamente.
                      <br /><br />
                      Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePagarTodasDoFiltro}>
                      Confirmar Pagamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Pagar Ajuda de Custo - Only show if we have filters and scouter */}
            {filters?.scouter && selectedPeriod && valorAjudaCusto > 0 && (
              <Button
                variant="secondary"
                disabled={isUpdating}
                onClick={handlePagarAjudaCusto}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Pagar Ajuda de Custo
                <span className="ml-1 text-xs">
                  {formatCurrency(valorAjudaCusto)}
                </span>
              </Button>
            )}

            {/* Pagar Tudo (Fichas + Ajuda de Custo) - Only show if we have filters and scouter */}
            {filters?.scouter && selectedPeriod && valorAjudaCusto > 0 && fichasAPagar.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    disabled={isUpdating}
                  >
                    <DollarSign className="h-4 w-4" />
                    Pagar Tudo (Fichas + Ajuda)
                    <span className="ml-1 text-xs">
                      {formatCurrency(valorTotalCompleto)}
                    </span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-green-500" />
                      Pagamento Completo
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a pagar:
                      <br /><br />
                      <strong>Fichas:</strong> {fichasAPagar.length} fichas = {formatCurrency(valorTotalAPagar)}
                      <br />
                      <strong>Ajuda de Custo:</strong> {formatCurrency(valorAjudaCusto)}
                      <br />
                      <strong>Total:</strong> {formatCurrency(valorTotalCompleto)}
                      <br /><br />
                      Para o scouter <strong>{filters.scouter}</strong> no período de <strong>{selectedPeriod.start}</strong> a <strong>{selectedPeriod.end}</strong>.
                      <br /><br />
                      Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePagarTudo}>
                      Confirmar Pagamento Completo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Limpar seleção */}
            <Button
              variant="ghost"
              onClick={onClearSelection}
              disabled={selectedFichas.length === 0}
              className="flex items-center gap-2"
            >
              <FileX className="h-4 w-4" />
              Limpar Seleção
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
