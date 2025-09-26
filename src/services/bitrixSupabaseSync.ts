// Simplified service since we're now using the new fichas structure

export async function syncLeadsToSupabase(rawLeads: any[], userId?: string): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> {
  console.log("Bitrix sync disabled - using new fichas structure");
  return { processed: 0, created: 0, updated: 0, errors: 0 };
}

export async function createSyncRun(userId: string, syncType: string) {
  console.log("Bitrix sync disabled - using new fichas structure");
  return null;
}

export async function completeSyncRun(runId: string, stats: {
  records_processed?: number;
  records_created?: number;
  records_updated?: number;
  records_failed?: number;
}) {
  console.log("Bitrix sync disabled - using new fichas structure");
}

export async function failSyncRun(runId: string, message: string) {
  console.log("Bitrix sync disabled - using new fichas structure");
}