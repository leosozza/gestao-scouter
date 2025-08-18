
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, FileX, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
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
}

export const PaymentBatchActions = ({
  fichasFiltradas,
  selectedFichas,
  isUpdating,
  onUpdateFichaPaga,
  onClearSelection,
  filterType,
  filterValue
}: PaymentBatchActionsProps) => {
  const { toast } = useToast();

  const fichasAPagar = fichasFiltradas.filter(f => f['Ficha paga'] !== 'Sim');
  const fichasSelecionadas = fichasFiltradas.filter(f => selectedFichas.includes(f.ID?.toString()));
  
  const valorTotalSelecionadas = fichasSelecionadas.reduce((total, ficha) => {
    const valor = parseFloat(ficha['Valor por Fichas'] || 0);
    return total + (isNaN(valor) ? 0 : valor);
  }, 0);

  const valorTotalAPagar = fichasAPagar.reduce((total, ficha) => {
    const valor = parseFloat(ficha['Valor por Fichas'] || 0);
    return total + (isNaN(valor) ? 0 : valor);
  }, 0);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Ações de Pagamento em Lote
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Resumo do filtro atual */}
          {filterType && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{filterType}: {filterValue}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total de fichas:</span>
                  <br />
                  <span className="font-medium">{fichasFiltradas.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fichas a pagar:</span>
                  <br />
                  <span className="font-medium text-orange-600">{fichasAPagar.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor total a pagar:</span>
                  <br />
                  <span className="font-medium text-orange-600">{formatCurrency(valorTotalAPagar)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Selecionadas:</span>
                  <br />
                  <span className="font-medium">{selectedFichas.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-3">
            {/* Pagar fichas selecionadas */}
            <Button
              onClick={handlePagarSelecionadas}
              disabled={selectedFichas.length === 0 || isUpdating}
              className="flex items-center gap-2"
            >
              <FileCheck className="h-4 w-4" />
              Pagar Selecionadas ({selectedFichas.length})
              {selectedFichas.length > 0 && (
                <span className="ml-1 text-xs">
                  {formatCurrency(valorTotalSelecionadas)}
                </span>
              )}
            </Button>

            {/* Pagar todas do filtro */}
            {fichasAPagar.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isUpdating}
                    className="flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    Pagar Todas do {filterType || 'Filtro'} ({fichasAPagar.length})
                    <span className="ml-1 text-xs">
                      {formatCurrency(valorTotalAPagar)}
                    </span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Confirmar Pagamento em Lote
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a marcar como pagas <strong>{fichasAPagar.length} fichas</strong> 
                      {filterType && (
                        <span> do {filterType.toLowerCase()} <strong>"{filterValue}"</strong></span>
                      )}
                      , no valor total de <strong>{formatCurrency(valorTotalAPagar)}</strong>.
                      <br /><br />
                      Esta ação também atualizará a planilha do Google Sheets automaticamente.
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
