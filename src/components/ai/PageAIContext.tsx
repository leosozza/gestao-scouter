import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface PageDataBuilderParams {
  pathname: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

export type PageDataBuilder =
  | ((params: PageDataBuilderParams) => Promise<any>)
  | ((params: PageDataBuilderParams) => any);

interface PageAIContextValue {
  pageId: string;
  pageData: any;
  refreshPageData: () => void;
  loading: boolean;
  lastUpdated: number | null;
}

const PageAIContext = createContext<PageAIContextValue | undefined>(undefined);

interface PageAIProviderProps {
  pathname: string;
  searchParams?: Record<string, string | string[] | undefined>;
  buildPageData: PageDataBuilder;
  children: React.ReactNode;
  debounceMs?: number;
}

function makePageId(pathname: string): string {
  if (!pathname || pathname === "/") return "home";
  return (
    pathname
      .replace(/^\/+/g, "")
      .replace(/\/+/g, ":")
      .replace(/[^a-zA-Z0-9:_-]/g, "") || "page"
  );
}

export const PageAIProvider: React.FC<PageAIProviderProps> = ({
  pathname,
  searchParams,
  buildPageData,
  children,
  debounceMs = 120,
}) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const pageId = makePageId(pathname);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await buildPageData({ pathname, searchParams });
      setPageData(result);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error("Falha ao construir pageData:", err);
    } finally {
      setLoading(false);
    }
  }, [pathname, searchParams, buildPageData]);

  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, debounceMs);
    return () => clearTimeout(t);
  }, [load, debounceMs]);

  const refreshPageData = useCallback(() => {
    load();
  }, [load]);

  return (
    <PageAIContext.Provider
      value={{ pageId, pageData, refreshPageData, loading, lastUpdated }}
    >
      {children}
    </PageAIContext.Provider>
  );
};

export function usePageAI() {
  const ctx = useContext(PageAIContext);
  if (!ctx) {
    throw new Error("usePageAI deve ser usado dentro de <PageAIProvider>");
  }
  return ctx;
}