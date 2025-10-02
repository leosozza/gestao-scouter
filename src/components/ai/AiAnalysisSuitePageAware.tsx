import React, { useEffect } from "react";
import { AiAnalysisSuite } from "./AiAnalysisSuite";
import { usePageAI } from "./PageAIContext";
import { useGeminiAnalysis } from "./useGeminiAnalysis";

export interface AiAnalysisSuitePageAwareProps {
  endpoint?: string;
  autoQuestion?: string | ((pageData: any) => string);
  askOnEmptyOnly?: boolean;
  enableStreaming?: boolean;
  streamingParserMode?: "openai" | "raw";
  persistPrefix?: string;
}

export const AiAnalysisSuitePageAware: React.FC<AiAnalysisSuitePageAwareProps> = ({
  endpoint = "/api/ai-analysis",
  autoQuestion,
  askOnEmptyOnly = true,
  enableStreaming = true,
  streamingParserMode = "openai",
  persistPrefix = "page:",
}) => {
  const { pageId, pageData } = usePageAI();

  const { messages, sendMessage, appendSystemMessage } = useGeminiAnalysis({
    endpoint,
    pageData,
    persistKey: `${persistPrefix}${pageId}-init`,
    enableStreaming: false,
  });

  useEffect(() => {
    if (!autoQuestion) return;
    if (askOnEmptyOnly && messages.length > 0) return;
    if (!pageData) return;

    const question =
      typeof autoQuestion === "function" ? autoQuestion(pageData) : autoQuestion;

    const alreadyAsked = messages.some(
      m => m.role === "user" && m.content === question
    );
    if (alreadyAsked) return;

    appendSystemMessage(
      `SNAPSHOT_INICIAL(${pageId}) ${new Date().toISOString()}`
    );

    const t = setTimeout(() => {
      sendMessage(question);
    }, 250);
    return () => clearTimeout(t);
  }, [autoQuestion, askOnEmptyOnly, messages, pageData, sendMessage, appendSystemMessage, pageId]);

  return (
    <AiAnalysisSuite
      endpoint={endpoint}
      pageData={pageData}
      persistKey={`${persistPrefix}${pageId}`}
      enableStreaming={enableStreaming}
      streamingParserMode={streamingParserMode}
    />
  );
};
