import { useCallback, useMemo, useRef, useState } from "react";
import { GoogleSheetsService } from "@/services/googleSheetsService";

export type SyncState = "idle" | "syncing" | "ok" | "error";

export function useSync() {
  const [state, setState] = useState<SyncState>("idle");
  const lastErrorRef = useRef<Error | null>(null);
  const lastSyncRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState("syncing");
      GoogleSheetsService.invalidate();
      await GoogleSheetsService.fetchFichas({ force: true });
      lastSyncRef.current = Date.now();
      setState("ok");
    } catch (e: any) {
      lastErrorRef.current = e;
      setState("error");
    }
  }, []);

  const info = useMemo(() => ({
    state,
    lastSync: lastSyncRef.current,
    lastError: lastErrorRef.current,
  }), [state]);

  return { ...info, refresh };
}