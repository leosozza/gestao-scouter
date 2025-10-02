# IA Analysis Suite

Conjunto de componentes para habilitar um fluxo completo de análise assistida por IA:

- Botão superior (toggle)
- FAB flutuante
- Painel lateral com chat
- Streaming incremental (SSE)
- Persistência por página (localStorage)
- Exportação (Markdown / PDF)
- Apêndice de mensagens system
- Contextualização dinâmica via PageAIProvider

## Instalação

Coloque os arquivos em `src/components/ai` e garanta que o Tailwind esteja configurado.

## Uso Direto

```tsx
<AiAnalysisSuite endpoint="/api/ai-analysis" pageData={{ leadsHoje: 42 }} />
```

## Uso com Contexto por Página (Next.js App Router)

```tsx
"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { PageAIProvider } from "@/components/ai/PageAIContext";
import { AiAnalysisSuitePageAware } from "@/components/ai/AiAnalysisSuitePageAware";

function buildPageData({ pathname, searchParams }: any) {
  return {
    rota: pathname,
    filtros: { periodo: searchParams?.periodo || "30d" },
    kpis: { leadsHoje: 40, conversao: 0.128 },
    timestamp: Date.now(),
  };
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const searchObj: Record<string, string> = {};
  sp?.forEach((v, k) => (searchObj[k] = v));

  return (
    <PageAIProvider
      pathname={pathname}
      searchParams={searchObj}
      buildPageData={buildPageData}
    >
      {children}
      <div className="fixed top-4 right-4 flex gap-2 z-50">
        <button className="px-3 py-1.5 rounded border bg-slate-200 text-sm">GS</button>
        <AiAnalysisSuitePageAware
          autoQuestion="Quais insights iniciais sobre esta página?"
          askOnEmptyOnly
          enableStreaming
        />
      </div>
    </PageAIProvider>
  );
}
```

## Streaming

Backend deve retornar `text/event-stream` com linhas:

```
data: {"choices":[{"delta":{"content":"texto parcial"}}]}
...
data: [DONE]
```

## Exemplo de Endpoint (App Router)

```ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages = [], data = {}, stream } = await req.json();

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: "Iniciando análise..." } }] })}\n\n`
          )
        );
        await new Promise(r => setTimeout(r, 400));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: " Dados consolidados." } }] })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: `Resumo estático baseado em ${messages.length} mensagens e contexto ${Object.keys(
              data || {}
            ).join(", ")}`,
          },
        },
      ],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
```

## Exportação

Botões `.md` e `PDF` no cabeçalho do painel.

## Segurança & Boas Práticas
- Limitar tamanho de `pageData`
- Remover dados sensíveis
- Aplicar rate limiting

## Licença
Interno.
