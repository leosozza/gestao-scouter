import React, { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";

type Ficha = {
  created_at?: string;
  data_criacao_ficha?: string;
  criado?: string;
  projeto?: string;
  projetos_comerciais?: string;
  scouter?: string;
  gestao_de_scouter?: string;
  confirmado?: boolean | string;
  tem_foto?: boolean | string;
  valor_ficha?: number | string;
  [key: string]: any;
};

type Props = {
  startDate: Date;
  endDate: Date;
  rows: Ficha[];
  projectName?: string | null;
};

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim().toLowerCase() === "sim";
  return !!v;
}

export default function AIInsightsPanel({ startDate, endDate, rows, projectName }: Props) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const kpis = useMemo(() => {
    const total = rows.length;
    const byDay = new Map<string, number>();
    let confirmados = 0;
    let comFoto = 0;
    let valorTotal = 0;

    for (const r of rows) {
      const iso = (r.data_criacao_ficha ?? r.created_at ?? r.criado ?? "").slice(0, 10);
      if (iso) byDay.set(iso, (byDay.get(iso) ?? 0) + 1);
      if (toBool(r.confirmado)) confirmados++;
      if (toBool(r.tem_foto)) comFoto++;
      const valorFicha = typeof r.valor_ficha === "number" ? r.valor_ficha : parseFloat(String(r.valor_ficha || 0));
      if (!isNaN(valorFicha)) valorTotal += valorFicha;
    }

    const daily = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const best = daily.reduce((m, d) => (d.count > (m?.count ?? 0) ? d : m), null as any);
    const worst = daily.reduce((m, d) => (d.count < (m?.count ?? Infinity) ? d : m), null as any);

    const confirmRate = total ? (confirmados / total) : 0;
    const fotoRate = total ? (comFoto / total) : 0;
    const avgPerDay = daily.length ? total / daily.length : 0;

    // tendência simples: compara média dos 3 últimos dias vs 3 primeiros
    const head = daily.slice(0, 3).reduce((s, d) => s + d.count, 0) / Math.max(1, Math.min(3, daily.length));
    const tail = daily.slice(-3).reduce((s, d) => s + d.count, 0) / Math.max(1, Math.min(3, daily.length));
    const trend = tail - head;

    // top projetos/scouters (se presentes)
    const top = (keys: string[]) => {
      const map = new Map<string, number>();
      for (const r of rows) {
        let k = "";
        for (const key of keys) {
          k = String(r[key] ?? "");
          if (k) break;
        }
        if (!k) continue;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };

    return {
      total,
      valorTotal,
      confirmRate,
      fotoRate,
      avgPerDay,
      best,
      worst,
      trend,
      topProjetos: top(["projeto", "projetos_comerciais"]),
      topScouters: top(["scouter", "gestao_de_scouter"]),
      daily
    };
  }, [rows]);

  const localNarrative = useMemo(() => {
    const p = (n: number) => (n * 100).toFixed(1) + "%";
    const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    
    const formatSafeDate = (dateStr: string) => {
      try {
        const date = parseISO(dateStr);
        if (isValid(date)) {
          return format(date, "dd/MM", { locale: ptBR });
        }
      } catch {
        // ignore
      }
      return dateStr;
    };
    
    const period = `${format(startDate, "dd/MM", { locale: ptBR })}–${format(endDate, "dd/MM", { locale: ptBR })}`;
    const bestTxt = kpis.best ? `${formatSafeDate(kpis.best.date)} (${kpis.best.count})` : "-";
    const worstTxt = kpis.worst ? `${formatSafeDate(kpis.worst.date)} (${kpis.worst.count})` : "-";
    const trendTxt = kpis.trend > 0 ? "alta" : kpis.trend < 0 ? "queda" : "estável";
    const projTxt = kpis.topProjetos.map(([n, v]) => `${n}: ${v}`).join(" • ") || "-";
    const scoutTxt = kpis.topScouters.map(([n, v]) => `${n}: ${v}`).join(" • ") || "-";
    
    return [
      `📅 Período ${period}${projectName ? ` | Projeto: ${projectName}` : ""}`,
      `📊 Total de fichas: ${kpis.total} | Média/dia: ${kpis.avgPerDay.toFixed(1)}`,
      `📈 Dia pico: ${bestTxt} | Dia fraco: ${worstTxt} | Tendência: ${trendTxt}`,
      `✅ Taxa de confirmados: ${p(kpis.confirmRate)} | 📷 Com foto: ${p(kpis.fotoRate)}`,
      typeof kpis.valorTotal === "number" && kpis.valorTotal > 0 ? `💰 Valor total estimado: ${brl(kpis.valorTotal)}` : "",
      `🎯 Top Projetos: ${projTxt}`,
      `👥 Top Scouters: ${scoutTxt}`
    ].filter(Boolean).join("\n");
  }, [kpis, startDate, endDate, projectName]);

  async function runAI() {
    try {
      setLoadingAI(true);
      // Fallback: mostra só a narrativa local (sem LLM)
      // TODO: Integrar com Edge Function quando necessário
      setAiText(buildPrompt(localNarrative, kpis));
    } finally {
      setLoadingAI(false);
    }
  }

  const TrendIcon = kpis.trend > 0 ? TrendingUp : kpis.trend < 0 ? TrendingDown : Minus;
  const trendColor = kpis.trend > 0 ? "text-green-500" : kpis.trend < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="text-sm font-medium">IA de Performance</div>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </div>
        <Button
          onClick={runAI}
          variant="outline"
          size="sm"
          disabled={loadingAI}
        >
          {loadingAI ? "Analisando..." : "Analisar agora"}
        </Button>
      </div>

      <div className="rounded-md bg-muted/50 p-3">
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">
          {aiText ?? localNarrative}
        </pre>
      </div>

      <div className="space-y-2 text-sm">
        <div className="font-medium">💡 Insights:</div>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          {kpis.trend < -1 && (
            <li>⚠️ Tendência de queda detectada - reforçar ações de captação</li>
          )}
          {kpis.avgPerDay < 5 && (
            <li>📉 Média diária abaixo do ideal - considerar aumentar meta</li>
          )}
          {kpis.confirmRate < 0.7 && (
            <li>✅ Taxa de confirmados pode melhorar - reforçar qualificação</li>
          )}
          {kpis.fotoRate < 0.8 && (
            <li>📷 Aumentar taxa de fichas com foto para melhor conversão</li>
          )}
          {kpis.best && (
            <li>🎯 Replicar práticas do dia pico ({kpis.best.date.slice(8, 10)}/{kpis.best.date.slice(5, 7)})</li>
          )}
          {kpis.topScouters.length > 0 && (
            <li>👥 Focar nos top scouters: {kpis.topScouters.slice(0, 2).map(([n]) => n).join(", ")}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function buildPrompt(narrative: string, kpis: any) {
  return [
    "🤖 Análise de Performance",
    "",
    narrative,
    "",
    "💡 Ações Sugeridas:",
    "• Reforçar briefing no meio da semana",
    "• Estabelecer meta diária por scouter",
    "• Incentivar envio de foto e confirmação",
    "• Monitorar dias de baixa performance",
    "• Celebrar e replicar práticas dos dias pico"
  ].join("\n");
}
