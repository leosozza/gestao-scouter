'use client';

import React, { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PageAIProvider } from '@/components/ai/PageAIContext';
import { AiAnalysisSuitePageAware } from '@/components/ai/AiAnalysisSuitePageAware';

function buildPageData({ pathname, searchParams }: { pathname: string; searchParams?: Record<string, string | string[] | undefined> }) {
  // Basic pageData builder — customize to include KPIs/filters from your stores
  return {
    rota: pathname,
    filtros: {
      periodo: (searchParams as any)?.periodo || '30d',
    },
    kpis: {
      leadsHoje: 42,
      conversao: 0.12,
    },
    timestamp: Date.now(),
  };
}

export function AIProviderRoot({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const searchObj: Record<string, string> = useMemo(() => Object.fromEntries(new URLSearchParams(location.search)), [location.search]);

  const pageData = useMemo(() => buildPageData({ pathname, searchParams: searchObj }), [pathname, searchObj]);

  return (
    <PageAIProvider pathname={pathname} searchParams={searchObj} buildPageData={() => pageData}>
      <div className="fixed top-4 right-4 z-50 flex gap-2 items-center">
        <button className="px-3 py-1.5 rounded border bg-slate-200 text-sm">GS</button>
        <AiAnalysisSuitePageAware autoQuestion="Quais insights iniciais sobre esta página?" askOnEmptyOnly enableStreaming />
      </div>
      {children}
    </PageAIProvider>
  );
}
