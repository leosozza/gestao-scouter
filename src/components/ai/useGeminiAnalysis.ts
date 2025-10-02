import { useState, useCallback, useEffect, useRef } from "react";
import type { AIMessage } from "./types";

export interface UseGeminiAnalysisOptions {
  endpoint?: string;
  pageData?: any;
  initialMessages?: AIMessage[];
  persistKey?: string | null;
  enableStreaming?: boolean;
  streamingParserMode?: "openai" | "raw";
  onError?: (err: Error) => void;
}

interface SendMessageConfig {
  appendToLastAssistant?: boolean;
}

interface UseGeminiAnalysisReturn {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (userMessage: string, config?: SendMessageConfig) => Promise<void>;
  clearMessages: () => void;
  cancelStreaming: () => void;
  isStreaming: boolean;
  partialAssistant?: string;
  appendSystemMessage: (content: string) => void;
}

const STORAGE_PREFIX = "ai-analysis:";

export function useGeminiAnalysis({
  endpoint = "/api/ai-analysis",
  pageData,
  initialMessages = [],
  persistKey = null,
  enableStreaming = false,
  streamingParserMode = "openai",
  onError,
}: UseGeminiAnalysisOptions = {}): UseGeminiAnalysisReturn {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [partialAssistant, setPartialAssistant] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!persistKey) return;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + persistKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch (err) {
      console.warn("Falha ao ler localStorage:", err);
    }
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + persistKey, JSON.stringify(messages));
    } catch (err) {
      console.warn("Falha ao salvar localStorage:", err);
    }
  }, [messages, persistKey]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPartialAssistant(undefined);
    if (persistKey) {
      try {
        localStorage.removeItem(STORAGE_PREFIX + persistKey);
      } catch {}
    }
  }, [persistKey]);

  const cancelStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const finalizeAssistantMessage = useCallback(() => {
    if (partialAssistant && partialAssistant.trim().length > 0) {
      setMessages(prev => [...prev, { role: "assistant", content: partialAssistant }]);
      setPartialAssistant(undefined);
    }
  }, [partialAssistant]);

  const appendSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { role: "system", content }]);
  }, []);

  const parseOpenAIStreamLine = (line: string): string | null => {
    if (!line.startsWith("data:")) return null;
    const payload = line.replace(/^data:\s*/, "");
    if (payload === "[DONE]") return "__DONE__";
    try {
      const json = JSON.parse(payload);
      const delta = json?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") return delta;
    } catch {
      return null;
    }
    return null;
  };

  const readStream = async (res: Response) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Resposta sem body para streaming");
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      if (streamingParserMode === "openai") {
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          const parsed = parseOpenAIStreamLine(line);
          if (!parsed) continue;
          if (parsed === "__DONE__") {
            finalizeAssistantMessage();
            setIsStreaming(false);
            setIsLoading(false);
            return;
          } else {
            setPartialAssistant(prev => (prev || "") + parsed);
          }
        }
      } else {
        setPartialAssistant(prev => (prev || "") + chunk);
      }
    }
    finalizeAssistantMessage();
    setIsStreaming(false);
    setIsLoading(false);
  };

  const sendMessage = useCallback(
    async (userMessage: string, _config?: SendMessageConfig) => {
      if (!userMessage.trim()) return;
      if (isLoading || isStreaming) cancelStreaming();

      setError(null);
      setIsLoading(true);
      setPartialAssistant(undefined);

      const newUser: AIMessage = { role: "user", content: userMessage };
      const baseMessages = [...messages, newUser];
      setMessages(baseMessages);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (enableStreaming) {
          headers["Accept"] = "text/event-stream";
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: baseMessages,
            data: pageData,
            stream: enableStreaming,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        const contentType = res.headers.get("content-type") || "";

        if (
          enableStreaming &&
          (contentType.includes("text/event-stream") ||
            contentType.includes("application/octet-stream"))
        ) {
          setIsStreaming(true);
          await readStream(res);
        } else {
          const json = await res.json();
          const content =
            json?.choices?.[0]?.message?.content ||
            json?.message?.content ||
            json?.output ||
            JSON.stringify(json);
          setMessages(prev => [...prev, { role: "assistant", content }]);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          setError("Streaming cancelado.");
        } else {
          const msg = err?.message || "Erro desconhecido";
          setError(msg);
          onError?.(err);
        }
        setIsLoading(false);
        setIsStreaming(false);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      messages,
      endpoint,
      pageData,
      enableStreaming,
      isLoading,
      isStreaming,
      cancelStreaming,
      readStream,
      finalizeAssistantMessage,
      onError,
      streamingParserMode,
    ]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    cancelStreaming,
    isStreaming,
    partialAssistant,
    appendSystemMessage,
  };
}