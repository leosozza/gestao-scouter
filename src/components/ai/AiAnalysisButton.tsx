import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export interface AiAnalysisButtonProps {
  onFabClick?: () => void;
  onActiveChange?: (active: boolean) => void;
  controlledActive?: boolean;
  usePortal?: boolean;
  className?: string;
  topButtonLabel?: string;
  fabLabel?: string;
  disabled?: boolean;
}

export const AiAnalysisButton: React.FC<AiAnalysisButtonProps> = ({
  onFabClick,
  onActiveChange,
  controlledActive,
  usePortal = false,
  className = "",
  topButtonLabel = "Análise IA",
  fabLabel = "Abrir análise de IA",
  disabled = false,
}) => {
  const isControlled = typeof controlledActive === "boolean";
  const [internalActive, setInternalActive] = useState(false);
  const isActive = isControlled ? !!controlledActive : internalActive;

  const toggle = useCallback(() => {
    if (disabled) return;
    if (isControlled) {
      onActiveChange?.(!controlledActive);
    } else {
      setInternalActive(prev => {
        const next = !prev;
        onActiveChange?.(next);
        return next;
      });
    }
  }, [disabled, isControlled, controlledActive, onActiveChange]);

  useEffect(() => {
    if (isControlled) onActiveChange?.(!!controlledActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const AiIcon = ({ className = "" }: { className?: string }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M4.93 4.93l2.12 2.12" />
      <path d="M16.95 16.95l2.12 2.12" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.93 19.07l2.12-2.12" />
      <path d="M16.95 7.05l2.12-2.12" />
    </svg>
  );

  const fabButton = (
    <button
      type="button"
      onClick={onFabClick}
      aria-label={fabLabel}
      className={[
        "group fixed z-[60] bottom-5 right-5 flex items-center justify-center rounded-full",
        "shadow-lg shadow-slate-900/20",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
        "bg-blue-600 hover:bg-blue-600/90 active:scale-95",
        "w-14 h-14 md:w-16 md:h-16",
        "text-white",
        "hover:scale-105",
        "border border-white/10 backdrop-blur-sm",
      ].join(" ")}
    >
      <AiIcon className="w-7 h-7 md:w-8 md:h-8 drop-shadow-sm" />
      <span className="sr-only">{fabLabel}</span>
    </button>
  );

  const maybePortalFab = usePortal
    ? createPortal(
        fabButton,
        typeof document !== "undefined" ? document.body : (null as any)
      )
    : fabButton;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-pressed={isActive}
        aria-label={topButtonLabel}
        title={topButtonLabel}
        className={[
          "inline-flex items-center gap-1.5 rounded-md border text-sm font-medium",
          "px-3 py-1.5 select-none",
          "transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : isActive
            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-600/90"
            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700",
          className,
        ].join(" ")}
      >
        <AiIcon
          className={[
            "w-4 h-4",
            isActive ? "text-white" : "text-slate-600 dark:text-slate-300",
          ].join(" ")}
        />
        <span className="hidden sm:inline">
          {isActive ? "IA Ativa" : "IA"}
        </span>
        <span
            className={[
              "ml-0.5 inline-block w-2 h-2 rounded-full",
              isActive
                ? "bg-green-400 shadow-[0_0_0_3px_rgba(34,197,94,0.35)]"
                : "bg-slate-400",
            ].join(" ")}
            aria-hidden="true"
        />
      </button>
      {isActive && maybePortalFab}
    </>
  );
};
