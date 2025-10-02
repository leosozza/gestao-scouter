import type { AIMessage } from "./types";

export function buildMarkdown(messages: AIMessage[]): string {
  const lines: string[] = [];
  lines.push("# Análise de IA\n");
  messages.forEach(m => {
    const role =
      m.role === "user"
        ? "👤 Usuário"
        : m.role === "assistant"
        ? "🤖 IA"
        : "🗂 Sistema";
    lines.push(`### ${role}\n`);
    lines.push(m.content.trim() + "\n");
  });
  return lines.join("\n");
}

export function exportMarkdown(messages: AIMessage[], filename = "analise-ia.md") {
  const md = buildMarkdown(messages);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
}

export async function exportPDF(messages: AIMessage[], filename = "analise-ia.pdf") {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const marginY = 48;
    const lineHeight = 14;
    const maxWidth = 515;
    let cursorY = marginY;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Análise de IA", marginX, cursorY);
    cursorY += 24;

    doc.setFontSize(11);

    messages.forEach((m, idx) => {
      const label =
        m.role === "user"
          ? "Usuário"
          : m.role === "assistant"
          ? "IA"
          : "Sistema";
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, marginX, cursorY);
      cursorY += lineHeight;
      doc.setFont("helvetica", "normal");

      const wrapped = doc.splitTextToSize(m.content, maxWidth);
      wrapped.forEach((line: string) => {
        if (cursorY > 780) {
          doc.addPage();
          cursorY = marginY;
        }
        doc.text(line, marginX, cursorY);
        cursorY += lineHeight;
      });

      cursorY += 10;
      if (idx < messages.length - 1 && cursorY > 780) {
        doc.addPage();
        cursorY = marginY;
      }
    });

    doc.save(filename);
  } catch (err) {
    console.error("Falha ao gerar PDF:", err);
    alert("Não foi possível gerar o PDF. Ver console.");
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}