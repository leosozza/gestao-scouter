import React, { useRef, useEffect, useState } from "react";
import type { AIMessage } from "./types";
import { exportMarkdown, exportPDF } from "./aiExportUtils";

export interface AiAnalysisChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: AIMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  partialAssistant?: string;
  error: string | null;
  onSend: (text: string) => void;
  onClear: () => void;
  onCancelStream?: () => void;
  title?: string;
  widthClass?: string;
  pageContextPreview?: any;
}

export const AiAnalysisChatPanel: React.FC<AiAnalysisChatPanelProps> = ({
  open,
  onClose,
  messages,
  isLoading,
  isStreaming,
  partialAssistant,
  error,
  onSend,
  onClear,
  onCancelStream,
  title = "Análise de IA",
  widthClass = "w-[420px] max-w-[90vw]",
  pageContextPreview,
}) => {
  const endRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, partialAssistant]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const allMessages = partialAssistant
    ? [...messages, { role: "assistant", content: partialAssistant }]
    : messages;

  return (
    <>
      <div
        aria-hidden={!open}
        className={[
          "fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "fixed z-[71] top-0 right-0 h-full flex flex-col",
          "bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700",
          "shadow-xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          widthClass,
        ].join(" ")}
      >
        <header className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportMarkdown(allMessages)}
              type="button"
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              .md
            </button>
            <button
              onClick={() => exportPDF(allMessages)}
              type="button"
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              PDF
            </button>
            <button
              onClick={onClear}
              className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Limpar
            </button>
            {isStreaming && onCancelStream && (
              <button
                onClick={onCancelStream}
                className="text-xs px-2 py-1 rounded border border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Parar
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fechar painel"
              className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {pageContextPreview && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-1">
              Contexto
            </p>
            <pre className="max-h-32 overflow-auto text-[11px] bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
{JSON.stringify(pageContextPreview, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {messages.length === 0 && !isLoading && !partialAssistant && (
            <div className="text-slate-500 dark:text-slate-400 text-xs italic">
              Faça uma pergunta sobre seus dados ou KPIs...
            </div>
          )}
          {allMessages.map((m, i) => {
            const isUser = m.role === "user";
            const isPartial =
              partialAssistant && i === allMessages.length - 1 && isStreaming;
            return (
              <div
                key={i}
                className={[
                  "flex",
                  isUser ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                <div
                  className={[
                    "rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap break-words relative",
                    isUser
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100",
                  ].join(" ")}
                >
                  {m.content}
                  {isPartial && (
                    <span className="inline-block w-2 h-3 ml-1 bg-blue-400 dark:bg-blue-300 animate-pulse align-baseline rounded" />
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && !isStreaming && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Analisando...
            </div>
          )}
          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-2 py-1 rounded">
              Erro: {error}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            if (!input.trim() || isLoading || isStreaming) return;
            onSend(input);
            setInput("");
          }}
          className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={1}
              placeholder={
                isStreaming ? "Aguarde o término do streaming..." : "Digite sua pergunta..."
              }
              disabled={isStreaming}
              className="flex-1 resize-none rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 disabled:opacity-60"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!input.trim() || isLoading || isStreaming) return;
                  onSend(input);
                  setInput("");
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || isStreaming || !input.trim()}
              className={[
                "px-4 h-10 rounded-md text-sm font-medium flex items-center gap-1",
                "bg-blue-600 text-white hover:bg-blue-600/90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              ].join(" ")}
            >
              {isLoading || isStreaming ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  {isStreaming ? "Transmitindo..." : "Enviando"}
                </span>
              ) : (
                <>  
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                  Enviar
                </>
              )}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}