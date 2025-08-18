
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Eye } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/formatters";

interface DailyFichasFilterProps {
  fichas: any[];
  selectedPeriod: { start: string; end: string } | null;
}

export const DailyFichasFilter = ({ fichas, selectedPeriod }: DailyFichasFilterProps) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Função para calcular valor seguro (mesma lógica do FinancialControlPanel)
  const calcularValorSeguro = (valorString: any, fichaId?: string) => {
    console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - Valor original:`, valorString, 'Tipo:', typeof valorString);
    
    if (valorString === null || valorString === undefined || valorString === '') {
      console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - Valor vazio ou null`);
      return 0;
    }
    
    let valorLimpo;
    
    // Se for número, usar diretamente
    if (typeof valorString === 'number') {
      valorLimpo = valorString;
      console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - Valor numérico:`, valorLimpo);
    } else {
      // Converter para string e limpar
      const str = String(valorString).trim();
      console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - String limpa:`, str);
      
      if (str === '' || str === 'null' || str === 'undefined' || str === '0' || str === 'N/A') {
        console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - String vazia ou inválida após limpeza`);
        return 0;
      }
      
      // Remover R$, espaços, e trocar vírgula por ponto
      valorLimpo = str
        .replace(/R\$\s*/g, '')
        .replace(/\s/g, '')
        .replace(',', '.');
      
      console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - Valor após limpeza:`, valorLimpo);
      
      // Tentar converter para número
      valorLimpo = parseFloat(valorLimpo);
    }
    
    const resultado = isNaN(valorLimpo) ? 0 : Math.max(0, valorLimpo);
    console.log(`[DAILY VALOR DEBUG] Ficha ${fichaId} - Valor final:`, resultado);
    
    return resultado;
  };

  // Agrupar fichas por data
  const fichasPorDia = fichas.reduce((acc, ficha) => {
    const dataCriado = ficha.Criado;
    if (!dataCriado) return acc;

    let dateKey;
    if (typeof dataCriado === 'string' && dataCriado.includes('/')) {
      const [day, month, year] = dataCriado.split('/');
      dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      const date = new Date(dataCriado);
      dateKey = format(date, 'yyyy-MM-dd');
    }

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(ficha);
    return acc;
  }, {} as Record<string, any[]>);

  // Ordenar datas
  const datasOrdenadas = Object.keys(fichasPorDia).sort().reverse();

  // Fichas do dia selecionado
  const fichasDoDay = selectedDate ? fichasPorDia[selectedDate] || [] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Fichas por Dia
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {datasOrdenadas.map((data) => {
            const fichasDoDia = fichasPorDia[data];
            
            // Separar fichas pagas e a pagar - CORRIGINDO A LÓGICA
            const fichasPagas = fichasDoDia.filter(f => f['Ficha paga'] === 'Sim');
            const fichasAPagar = fichasDoDia.filter(f => f['Ficha paga'] !== 'Sim');
            
            // Calcular valores usando a função correta
            const valorPago = fichasPagas.reduce((total, ficha) => {
              const valor = calcularValorSeguro(ficha['Valor por Fichas'], ficha.ID);
              return total + valor;
            }, 0);
            
            // CORRIGINDO: Calcular valor a pagar corretamente
            const valorAPagar = fichasAPagar.reduce((total, ficha) => {
              const valor = calcularValorSeguro(ficha['Valor por Fichas'], ficha.ID);
              console.log(`[DAILY A PAGAR DEBUG] Data ${data}, Ficha ${ficha.ID} - Status paga: "${ficha['Ficha paga']}", Valor: ${valor}`);
              return total + valor;
            }, 0);
            
            const valorTotal = valorPago + valorAPagar;

            console.log(`[DAILY DEBUG] Data ${data}: Total fichas=${fichasDoDia.length}, Pagas=${fichasPagas.length} (R$ ${valorPago}), A pagar=${fichasAPagar.length} (R$ ${valorAPagar}), Valor total=${valorTotal}`);

            return (
              <Dialog key={data}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto p-3 flex flex-col items-center gap-1 hover:bg-accent"
                  >
                    <div className="text-xs font-medium">
                      {format(new Date(data), 'dd/MM')}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {fichasDoDia.length} fichas
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(valorTotal)}
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="text-green-600">
                        Pagas: {formatCurrency(valorPago)}
                      </div>
                      <div className="text-orange-600">
                        A pagar: {formatCurrency(valorAPagar)}
                      </div>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>Fichas de {format(new Date(data), 'dd/MM/yyyy')}</span>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600">
                          {fichasPagas.length} pagas ({formatCurrency(valorPago)})
                        </span>
                        <span className="text-orange-600">
                          {fichasAPagar.length} a pagar ({formatCurrency(valorAPagar)})
                        </span>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Scouter</TableHead>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fichasDoDia.map((ficha) => (
                          <TableRow key={ficha.ID}>
                            <TableCell className="font-mono text-xs">{ficha.ID}</TableCell>
                            <TableCell>{ficha['Gestão de Scouter'] || 'N/A'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {ficha['Projetos Cormeciais'] || 'N/A'}
                            </TableCell>
                            <TableCell>{ficha['Primeiro nome'] || 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(calcularValorSeguro(ficha['Valor por Fichas'], ficha.ID))}</TableCell>
                            <TableCell>
                              <Badge variant={ficha['Ficha paga'] === 'Sim' ? 'default' : 'secondary'}>
                                {ficha['Ficha paga'] || 'Não'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
