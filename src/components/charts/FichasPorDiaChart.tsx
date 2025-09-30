import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Row = {
  created_at?: string;
  data_criacao_ficha?: string;
  criado?: string;
  [key: string]: any;
};

type Props = {
  startDate: Date;
  endDate: Date;
  rows: Row[];
  height?: number;
};

export default function FichasPorDiaChart({ startDate, endDate, rows, height = 280 }: Props) {
  const chartData = useMemo(() => {
    // Criar mapa de contagem por data
    const countByDate = new Map<string, number>();
    
    for (const row of rows) {
      const dateStr = (row.data_criacao_ficha ?? row.created_at ?? row.criado ?? "").slice(0, 10);
      if (dateStr) {
        countByDate.set(dateStr, (countByDate.get(dateStr) ?? 0) + 1);
      }
    }

    // Gerar todos os dias do intervalo
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDays.map(day => {
      const isoDate = format(day, "yyyy-MM-dd");
      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        fullDate: isoDate,
        fichas: countByDate.get(isoDate) ?? 0
      };
    });
  }, [startDate, endDate, rows]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
        />
        <Bar 
          dataKey="fichas" 
          fill="hsl(var(--primary))" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
