
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Cell, ResponsiveContainer, FunnelChart as RechartsFunction, Funnel, LabelList } from "recharts";

interface FunnelData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface FunnelChartProps {
  title: string;
  data: FunnelData[];
  isLoading?: boolean;
}

const chartConfig = {
  value: {
    label: "Quantidade",
  },
};

export const FunnelChart = ({ title, data, isLoading }: FunnelChartProps) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsFunction>
              <Funnel
                dataKey="value"
                data={data}
                isAnimationActive
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  position="center" 
                  fill="#fff" 
                  stroke="none" 
                  fontSize={12}
                  formatter={(value: number, payload: any) => {
                    if (!payload || !payload.payload) return value;
                    const entry = payload.payload;
                    return `${entry.name}: ${value} (${entry.percentage.toFixed(1)}%)`;
                  }}
                />
              </Funnel>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, props) => [
                      `${value} fichas (${props.payload?.percentage?.toFixed(1)}%)`,
                      props.payload?.name
                    ]}
                  />
                }
              />
            </RechartsFunction>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
