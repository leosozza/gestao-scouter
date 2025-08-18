
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
            const valorTotal = fichasDoDia.reduce((total, ficha) => {
              const valor = parseFloat(ficha['Valor por Fichas'] || 0);
              return total + (isNaN(valor) ? 0 : valor);
            }, 0);

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
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Fichas de {format(new Date(data), 'dd/MM/yyyy')} - {fichasDoDia.length} fichas
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
                            <TableCell>{formatCurrency(parseFloat(ficha['Valor por Fichas'] || 0))}</TableCell>
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
