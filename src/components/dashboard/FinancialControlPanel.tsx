import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Download, User, Briefcase } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO } from 'date-fns';
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { GoogleSheetsService } from "@/services/googleSheetsService";
import * as XLSX from 'xlsx';
import { DailyBreakdownPanel } from "./DailyBreakdownPanel";

interface FinancialControlPanelProps {
  fichas: any[];
  projetos: any[];
  onClose: () => void;
}

interface PaymentItem {
  id: string;
  scouter: string;
  valorTotal: number;
  fichasCount: number;
}

export const FinancialControlPanel: React.FC<FinancialControlPanelProps> = ({ fichas, projetos, onClose }) => {
  const [selectedScouter, setSelectedScouter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [startDate, setStartDate] = useState<string | undefined>('');
  const [endDate, setEndDate] = useState<string | undefined>('');

  // Atualiza as datas formatadas quando o intervalo de datas muda
  useEffect(() => {
    if (date?.from && date?.to) {
      setStartDate(format(date.from, 'yyyy-MM-dd'));
      setEndDate(format(date.to, 'yyyy-MM-dd'));
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [date]);

  const filteredFichas = useMemo(() => {
    let filtered = fichas;

    if (selectedScouter !== 'all') {
      filtered = filtered.filter(ficha => ficha.Gestao_de_Scouter === selectedScouter);
    }

    if (selectedProject !== 'all') {
      filtered = filtered.filter(ficha => ficha.Projetos_Comerciais === selectedProject);
    }

    return filtered;
  }, [fichas, selectedScouter, selectedProject]);

  const calculatePayments = useCallback(() => {
    const paymentsMap: { [scouter: string]: { valorTotal: number; fichasCount: number } } = {};

    filteredFichas.forEach(ficha => {
      const scouter = ficha.Gestao_de_Scouter;
      const valor = ficha.valor_por_ficha_num || 0;

      if (!paymentsMap[scouter]) {
        paymentsMap[scouter] = { valorTotal: 0, fichasCount: 0 };
      }

      paymentsMap[scouter].valorTotal += valor;
      paymentsMap[scouter].fichasCount += 1;
    });

    const payments: PaymentItem[] = Object.entries(paymentsMap).map(([scouter, data]) => ({
      id: scouter,
      scouter,
      valorTotal: data.valorTotal,
      fichasCount: data.fichasCount,
    }));

    setPaymentItems(payments);
  }, [filteredFichas]);

  useEffect(() => {
    calculatePayments();
  }, [calculatePayments, filteredFichas]);

  const generatePaymentReport = () => {
    const data = paymentItems.map(item => ({
      Scouter: item.scouter,
      'Total Fichas': item.fichasCount,
      'Valor Total': item.valorTotal,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Pagamentos');
    XLSX.writeFile(wb, 'relatorio_pagamentos.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 grid place-items-center">
      <Card className="max-w-4xl w-full mx-4 my-8 overflow-y-auto max-h-screen">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Controle Financeiro
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seletor de Scouter */}
            <div>
              <Label htmlFor="scouter">Scouter</Label>
              <Select value={selectedScouter} onValueChange={setSelectedScouter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os Scouters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Scouters</SelectItem>
                  {Array.from(new Set(fichas.map(ficha => ficha.Gestao_de_Scouter))).map(scouter => (
                    <SelectItem key={scouter} value={scouter}>
                      {scouter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Projeto */}
            <div>
              <Label htmlFor="project">Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os Projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {Array.from(new Set(fichas.map(ficha => ficha.Projetos_Comerciais))).map(project => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seletor de Data */}
          <div>
            <Label>Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      `${format(date.from, "dd/MM/yyyy")} - ${format(date.to, "dd/MM/yyyy")}`
                    ) : (
                      format(date.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Selecione um período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center" side="bottom">
                <Calendar
                  mode="range"
                  defaultMonth={date?.from ? date.from : new Date()}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  pagedNavigation
                />
              </PopoverContent>
            </Popover>
          </div>

        {/* Painel de Breakdown Diário */}
        {startDate && endDate && (
          <div className="mb-6">
            <DailyBreakdownPanel
              startDate={startDate}
              endDate={endDate}
              fichas={fichas}
              selectedScouter={selectedScouter}
              selectedProject={selectedProject}
            />
          </div>
        )}

        {/* Lista de Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pagamentos do Período</span>
              <Button
                onClick={generatePaymentReport}
                disabled={paymentItems.length === 0}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-2" />
                Relatório Excel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scouter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total de Fichas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.scouter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.fichasCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        R$ {item.valorTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paymentItems.length === 0 && (
              <div className="text-center py-4">
                Nenhum pagamento a ser exibido para o período e filtros selecionados.
              </div>
            )}
          </CardContent>
        </Card>
        </CardContent>
      </Card>
    </div>
  );
};
