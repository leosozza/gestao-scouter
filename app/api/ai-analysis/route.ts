import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages = [], data = {}, stream } = await req.json();

  // Exemplo simples. Substitua por chamada real ao provedor LLM.
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: "Iniciando análise..." } }] })}\n\n`
          )
        );
        await new Promise(r => setTimeout(r, 350));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: " Processando métricas..." } }] })}\n\n`
          )
        );
        await new Promise(r => setTimeout(r, 350));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: " Concluído." } }] })}\n\n`
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
            content: `Resposta não-stream: ${messages.length} mensagens; chaves contexto: ${Object.keys(
              data || {}
            ).join(",")}`,
          },
        },
      ],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}