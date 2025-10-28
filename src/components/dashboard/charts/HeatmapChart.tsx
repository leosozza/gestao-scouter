
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, RectangleProps } from "recharts";

interface HeatmapData {
  day: string;
  hour: number;
  value: number;
  percentage: number;
}

interface HeatmapChartProps {
  title: string;
  data: HeatmapData[];
  isLoading?: boolean;
}

const CustomCell = (props: RectangleProps & { payload?: HeatmapData }) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  
  const intensity = payload.percentage / 100;
  const color = `hsl(142, ${Math.round(65 * intensity)}%, ${Math.round(90 - 40 * intensity)}%)`;
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      stroke="hsl(var(--border))"
      strokeWidth={1}
      rx={2}
    />
  );
};

export const HeatmapChart = ({ title, data, isLoading }: HeatmapChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-24 gap-1 text-xs">
          {/* Header com horas */}
          <div></div>
          {hours.map(hour => (
            <div key={hour} className="text-center text-muted-foreground">
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
          
          {/* Grid do heatmap */}
          {days.map(day => (
            <div key={day} className="contents">
              <div className="text-muted-foreground font-medium py-2">{day}</div>
              {hours.map(hour => {
                const cellData = data.find(d => d.day === day && d.hour === hour);
                const intensity = cellData?.percentage || 0;
                const color = `hsl(142, ${Math.round(65 * intensity / 100)}%, ${Math.round(90 - 40 * intensity / 100)}%)`;
                
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="aspect-square rounded-sm border border-border/50 flex items-center justify-center text-xs cursor-pointer hover:ring-2 hover:ring-primary/50"
                    style={{ backgroundColor: color }}
                    title={`${day} ${hour}:00 - ${cellData?.value || 0} fichas (${intensity.toFixed(1)}%)`}
                  >
                    {cellData?.value || 0}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
