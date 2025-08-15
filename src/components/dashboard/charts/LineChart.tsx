import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LineChartProps {
  title: string;
  data: Array<{ 
    date: string; 
    real: number; 
    esperado: number;
    status: 'on-track' | 'behind';
  }>;
  isLoading?: boolean;
}

export const CustomLineChart = ({ title, data, isLoading }: LineChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 bg-muted rounded animate-pulse w-56" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit' 
              })}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
              formatter={(value: number, name: string) => [
                value.toLocaleString('pt-BR'), 
                name === 'real' ? 'Fichas Reais' : 'Meta Esperada'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="esperado" 
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Meta Esperada"
            />
            <Line 
              type="monotone" 
              dataKey="real" 
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              name="Fichas Reais"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};