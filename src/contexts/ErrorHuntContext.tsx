import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface ConsoleLog {
  timestamp: number;
  level: 'log' | 'error' | 'warn' | 'info';
  args: any[];
}

interface NetworkRequest {
  timestamp: number;
  url: string;
  method: string;
  status?: number;
  duration?: number;
}

interface ElementContext {
  timestamp: number;
  dom_path: string;
  react_component?: string;
  react_props?: any;
  page_url: string;
  viewport: { x: number; y: number };
}

interface ErrorHuntState {
  isActive: boolean;
  capturedLogs: ConsoleLog[];
  capturedErrors: Error[];
  networkRequests: NetworkRequest[];
  clickedElement: ElementContext | null;
}

interface ErrorHuntContextType extends ErrorHuntState {
  toggleMode: () => void;
  captureElementContext: (element: HTMLElement, event: MouseEvent) => void;
  clearContext: () => void;
}

const ErrorHuntContext = createContext<ErrorHuntContextType | undefined>(undefined);

export function ErrorHuntProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ErrorHuntState>({
    isActive: false,
    capturedLogs: [],
    capturedErrors: [],
    networkRequests: [],
    clickedElement: null,
  });

  const toggleMode = useCallback(() => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  const captureElementContext = useCallback((element: HTMLElement, event: MouseEvent) => {
    // Get DOM path
    const getDomPath = (el: HTMLElement): string => {
      const path: string[] = [];
      let current: HTMLElement | null = el;
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) selector += `#${current.id}`;
        if (current.className) selector += `.${current.className.split(' ').join('.')}`;
        path.unshift(selector);
        current = current.parentElement;
      }
      return path.join(' > ');
    };

    // Try to extract React Fiber info
    const getReactInfo = (el: HTMLElement): { component?: string; props?: any } => {
      const fiberKey = Object.keys(el).find(key => key.startsWith('__reactFiber'));
      if (fiberKey) {
        const fiber = (el as any)[fiberKey];
        return {
          component: fiber?.type?.name || fiber?.type?.displayName || typeof fiber?.type,
          props: fiber?.memoizedProps,
        };
      }
      return {};
    };

    const reactInfo = getReactInfo(element);

    setState(prev => ({
      ...prev,
      clickedElement: {
        timestamp: Date.now(),
        dom_path: getDomPath(element),
        react_component: reactInfo.component,
        react_props: reactInfo.props,
        page_url: window.location.pathname,
        viewport: { x: event.clientX, y: event.clientY },
      },
    }));
  }, []);

  const clearContext = useCallback(() => {
    setState(prev => ({
      ...prev,
      capturedLogs: [],
      capturedErrors: [],
      networkRequests: [],
      clickedElement: null,
    }));
  }, []);

  // Intercept console
  useEffect(() => {
    if (!state.isActive) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      setState(prev => ({
        ...prev,
        capturedLogs: [...prev.capturedLogs.slice(-49), { timestamp: Date.now(), level: 'log', args }],
      }));
      originalLog(...args);
    };

    console.error = (...args: any[]) => {
      setState(prev => ({
        ...prev,
        capturedLogs: [...prev.capturedLogs.slice(-49), { timestamp: Date.now(), level: 'error', args }],
      }));
      originalError(...args);
    };

    console.warn = (...args: any[]) => {
      setState(prev => ({
        ...prev,
        capturedLogs: [...prev.capturedLogs.slice(-49), { timestamp: Date.now(), level: 'warn', args }],
      }));
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [state.isActive]);

  // Intercept errors
  useEffect(() => {
    if (!state.isActive) return;

    const errorHandler = (event: ErrorEvent) => {
      setState(prev => ({
        ...prev,
        capturedErrors: [...prev.capturedErrors.slice(-19), event.error],
      }));
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, [state.isActive]);

  // Intercept fetch
  useEffect(() => {
    if (!state.isActive) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = Date.now();
      const getUrl = (input: RequestInfo | URL): string => {
        if (typeof input === 'string') return input;
        if (input instanceof URL) return input.toString();
        if (input instanceof Request) return input.url;
        return 'unknown';
      };
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        setState(prev => ({
          ...prev,
          networkRequests: [...prev.networkRequests.slice(-49), {
            timestamp: startTime,
            url: getUrl(args[0]),
            method: (args[1]?.method || 'GET').toUpperCase(),
            status: response.status,
            duration,
          }],
        }));
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        setState(prev => ({
          ...prev,
          networkRequests: [...prev.networkRequests.slice(-49), {
            timestamp: startTime,
            url: getUrl(args[0]),
            method: (args[1]?.method || 'GET').toUpperCase(),
            duration,
          }],
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [state.isActive]);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode]);

  return (
    <ErrorHuntContext.Provider
      value={{
        ...state,
        toggleMode,
        captureElementContext,
        clearContext,
      }}
    >
      {children}
    </ErrorHuntContext.Provider>
  );
}

export function useErrorHunt() {
  const context = useContext(ErrorHuntContext);
  if (!context) {
    throw new Error('useErrorHunt must be used within ErrorHuntProvider');
  }
  return context;
}
