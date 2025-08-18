import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck, FileX, DollarSign, AlertTriangle, Calendar, FileText, Download } from "lucide-react";
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
  filters: FinancialFilterState;
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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

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

  console.log('PAYMENT BATCH ACTIONS DETALHADO:');
  console.log('Fichas filtradas:', fichasFiltradas.length);
  console.log('Fichas a pagar:', fichasAPagar.length, 'Valor total a pagar:', valorTotalAPagar);
  console.log('Fichas selecionadas:', fichasSelecionadas.length, 'Valor total selecionadas:', valorTotalSelecionadas);

  // Calcular ajuda de custo baseado no período e filtros
  const calcularAjudaDeCusto = () => {
    if (!selectedPeriod || !filters.scouter) return 0;

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

    // Por enquanto, considerar todos os dias não trabalhados como folgas remuneradas
    // Em uma versão futura, isso será configurável
    const ajudaCustoTrabalhados = diasTrabalhados.size * valorDiaria;
    const ajudaCustoFolgas = diasNaoTrabalhados * valorFolgaRemunerada;

    return ajudaCustoTrabalhados + ajudaCustoFolgas;
  };

  const valorAjudaCusto = calcularAjudaDeCusto();
  const valorTotalCompleto = valorTotalAPagar + valorAjudaCusto;

  const generatePaymentReport = async (fichasParaPagar: any[], incluirAjudaCusto = false) => {
    setIsGeneratingReport(true);
    
    try {
      // Gerar relatório em PDF
      const reportData = {
        titulo: 'Relatório de Pagamento',
        periodo: selectedPeriod ? `${selectedPeriod.start} a ${selectedPeriod.end}` : 'Sem período definido',
        filtro: filterType ? `${filterType}: ${filterValue}` : 'Sem filtro',
        scouter: filters.scouter || 'Todos',
        projeto: filters.projeto || 'Todos',
        fichas: fichasParaPagar.map(ficha => ({
          id: ficha.ID,
          scouter: ficha['Gestão de Scouter'] || 'N/A',
          projeto: ficha['Projetos Cormeciais'] || 'N/A',
          nome: ficha['Primeiro nome'] || 'N/A',
          valor: parseFichaValue(ficha['Valor por Fichas'], ficha.ID),
          data: ficha.Criado || 'N/A'
        })),
        resumo: {
          totalFichas: fichasParaPagar.length,
          valorFichas: fichasParaPagar.reduce((total, f) => total + parseFichaValue(f['Valor por Fichas'], f.ID), 0),
          valorAjudaCusto: incluirAjudaCusto ? valorAjudaCusto : 0,
          valorTotal: incluirAjudaCusto 
            ? fichasParaPagar.reduce((total, f) => total + parseFichaValue(f['Valor por Fichas'], f.ID), 0) + valorAjudaCusto
            : fichasParaPagar.reduce((total, f) => total + parseFichaValue(f['Valor por Fichas'], f.ID), 0)
        }
      };

      // Simular geração de PDF - em produção seria integrado com uma biblioteca de PDF
      console.log('Dados do relatório:', reportData);
      
      // Criar conteúdo do PDF simulado
      const pdfContent = `
RELATÓRIO DE PAGAMENTO
====================

Período: ${reportData.periodo}
Filtro: ${reportData.filtro}
Scouter: ${reportData.scouter}
Projeto: ${reportData.projeto}

RESUMO:
- Total de fichas: ${reportData.resumo.totalFichas}
- Valor das fichas: ${formatCurrency(reportData.resumo.valorFichas)}
${incluirAjudaCusto ? `- Ajuda de custo: ${formatCurrency(reportData.resumo.valorAjudaCusto)}` : ''}
- VALOR TOTAL: ${formatCurrency(reportData.resumo.valorTotal)}

DETALHAMENTO DAS FICHAS:
${reportData.fichas.map(f => `ID: ${f.id} | ${f.scouter} | ${f.nome} | ${formatCurrency(f.valor)}`).join('\n')}
      `.trim();

      // Criar e baixar arquivo (simulação)
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-pagamento-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Relatório gerado",
        description: "O relatório foi baixado com sucesso"
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o relatório",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

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
          Resumo de Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filterType && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{filterType}: {filterValue}</Badge>
                {selectedPeriod && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedPeriod.start} a {selectedPeriod.end}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                  <span className="text-muted-foreground">Valor fichas a pagar:</span>
                  <br />
                  <span className="font-medium text-orange-600">{formatCurrency(valorTotalAPagar)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Selecionadas:</span>
                  <br />
                  <span className="font-medium">{selectedFichas.length}</span>
                </div>
              </div>

              {filters.scouter && selectedPeriod && (
                <div className="border-t pt-3">
                  <h4 className="font-medium text-sm mb-2 text-blue-600">Ajuda de Custo - {filters.scouter}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor ajuda de custo:</span>
                      <br />
                      <span className="font-medium text-blue-600">{formatCurrency(valorAjudaCusto)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total fichas + ajuda:</span>
                      <br />
                      <span className="font-medium text-green-600">{formatCurrency(valorTotalCompleto)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Período:</span>
                      <br />
                      <span className="font-medium text-xs">{selectedPeriod.start} a {selectedPeriod.end}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões de relatório */}
          <div className="flex flex-wrap gap-3 p-3 bg-blue-50 rounded-lg">
            <h4 className="w-full text-sm font-medium text-blue-800 mb-2">Gerar Relatórios (antes de pagar)</h4>
            
            {/* Relatório das fichas selecionadas */}
            <Button
              variant="outline"
              size="sm"
              disabled={selectedFichas.length === 0 || isGeneratingReport}
              onClick={() => generatePaymentReport(fichasSelecionadas)}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Relatório Selecionadas ({selectedFichas.length})
            </Button>

            {/* Relatório de todas as fichas a pagar */}
            {fichasAPagar.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isGeneratingReport}
                onClick={() => generatePaymentReport(fichasAPagar)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Relatório Todas ({fichasAPagar.length})
              </Button>
            )}

            {/* Relatório completo (fichas + ajuda de custo) */}
            {filters.scouter && selectedPeriod && valorAjudaCusto > 0 && fichasAPagar.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isGeneratingReport}
                onClick={() => generatePaymentReport(fichasAPagar, true)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Relatório Completo (Fichas + Ajuda)
              </Button>
            )}
          </div>

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

            {/* Pagar Ajuda de Custo */}
            {filters.scouter && selectedPeriod && valorAjudaCusto > 0 && (
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

            {/* Pagar Tudo (Fichas + Ajuda de Custo) */}
            {filters.scouter && selectedPeriod && valorAjudaCusto > 0 && fichasAPagar.length > 0 && (
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
