import React, { useState, useCallback } from "react";
import { AiAnalysisButton } from "./AiAnalysisButton";
import { AiAnalysisChatPanel } from "./AiAnalysisChatPanel";
import { useGeminiAnalysis } from "./useGeminiAnalysis";

export interface AiAnalysisSuiteProps {
  endpoint?: string;
  pageData?: any;
  initialOpen?: boolean;
  className?: string;
  autoOpenPanelOnActivate?: boolean;
  panelWidthClass?: string;
  persistKey?: string | null;
  enableStreaming?: boolean;
  streamingParserMode?: "openai" | "raw";
}

export const AiAnalysisSuite: React.FC<AiAnalysisSuiteProps> = ({
  endpoint = "/api/ai-analysis",
  pageData,
  initialOpen = false,
  className = "",
  autoOpenPanelOnActivate = false,
  panelWidthClass,
  persistKey = "principal",
  enableStreaming = true,
  streamingParserMode = "openai",
}) => {
  const [isActive, setIsActive] = useState(initialOpen);
  const [panelOpen, setPanelOpen] = useState(false);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    cancelStreaming,
    isStreaming,
    partialAssistant,
  } = useGeminiAnalysis({
    endpoint,
    pageData,
    persistKey,
    enableStreaming,
    streamingParserMode,
  });

  const handleFabClick = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const handleActiveChange = useCallback(
    (active: boolean) => {
      setIsActive(active);
      if (!active) {
        setPanelOpen(false);
      } else if (active && autoOpenPanelOnActivate) {
        setPanelOpen(true);
      }
    },
    [autoOpenPanelOnActivate]
  );

  return (
    <div className={className}>
      <AiAnalysisButton
        onFabClick={handleFabClick}
        onActiveChange={handleActiveChange}
        controlledActive={isActive}
      />
      <AiAnalysisChatPanel
        open={isActive && panelOpen}
        onClose={() => setPanelOpen(false)}
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        partialAssistant={partialAssistant}
        error={error}
        onSend={sendMessage}
        onClear={clearMessages}
        onCancelStream={cancelStreaming}
        pageContextPreview={pageData}
        widthClass={panelWidthClass}
      />
    </div>
  );
};
