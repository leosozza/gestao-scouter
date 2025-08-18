
import { supabase } from "@/integrations/supabase/client";
import { parse, isValid } from "date-fns";

type BitrixRawLead = Record<string, any>;

function toISO(date: Date | null): string | null {
  return date ? new Date(date).toISOString() : null;
}

export function normalizeDateTime(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Tenta formatos comuns vindos do Bitrix/planilhas
  const patterns = [
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy",
    "yyyy-MM-dd'T'HH:mm:ssXXX",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd",
  ];

  for (const p of patterns) {
    try {
      const d = parse(trimmed, p, new Date());
      if (isValid(d)) {
        return toISO(d);
      }
    } catch {
      // continua tentando outros formatos
    }
  }

  // Fallback: tenta o parser nativo
  const native = new Date(trimmed);
  if (isValid(native)) {
    return toISO(native);
  }

  return null;
}

function mapLead(raw: BitrixRawLead) {
  // Mapeia os campos conforme o exemplo fornecido pelo usuário
  // e o schema criado em bitrix_leads
  const bitrix_id = Number(raw?.ID);
  if (!Number.isFinite(bitrix_id)) return null;

  const idade = raw?.Idade != null ? Number(raw.Idade) : null;

  return {
    bitrix_id,
    etapa: raw?.Etapa ?? null,
    data_de_criacao_da_ficha: normalizeDateTime(raw?.Data_de_criacao_da_Ficha),
    primeiro_nome: raw?.Primeiro_nome ?? null,
    nome_do_modelo: raw?.Nome_do_Modelo ?? null,
    foto_do_modelo: raw?.Foto_do_modelo ?? null,
    telefone_de_trabalho: raw?.Telefone_de_trabalho ?? null,
    celular: raw?.Celular ?? null,
    local_da_abordagem: raw?.Local_da_Abordagem ?? null,
    op_telemarketing: raw?.Op_Telemarketing ?? null,
    ficha_confirmada: raw?.Ficha_confirmada ?? null,
    cadastro_existe_foto: raw?.Cadastro_Existe_Foto ?? null,
    scouter: raw?.Scouter ?? null,
    idade: Number.isFinite(idade) ? idade : null,
    agencia_e_seletivas: raw?.Agencia_e_Seletivas ?? null,
    alerta: raw?.Alerta ?? null,
    valor_da_ficha: raw?.Valor_da_Ficha ?? null,
    status_da_ficha: raw?.Status_da_Ficha ?? null,
    fonte: raw?.Fonte ?? null,
    gerenciamento_funil: raw?.Gerenciamento_funil ?? null,
    etapa_funil: raw?.Etapa_funil ?? null,
    supervisor_do_scouter: raw?.Supervisor_do_Scouter ?? null,
    presenca_confirmada: raw?.Presenca_confirmada ?? null,
    data_do_agendamento: normalizeDateTime(raw?.Data_do_agendamento),
    lead_score: raw?.Lead_Score ?? null,
  };
}

export async function upsertLeads(rawLeads: BitrixRawLead[]): Promise<number> {
  console.log("[bitrixSupabaseSync] upsertLeads: received", rawLeads?.length || 0);
  const rows = (rawLeads || [])
    .map(mapLead)
    .filter((r): r is NonNullable<ReturnType<typeof mapLead>> => !!r && Number.isFinite(r.bitrix_id as number));

  console.log("[bitrixSupabaseSync] upsertLeads: mapped", rows.length);

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("bitrix_leads")
    .upsert(rows, { onConflict: "bitrix_id" });

  if (error) {
    console.error("[bitrixSupabaseSync] upsertLeads error", error);
    throw error;
  }

  return rows.length;
}

export async function createSyncRun(userId: string, syncType: string) {
  console.log("[bitrixSupabaseSync] createSyncRun", { userId, syncType });
  const { data, error } = await supabase
    .from("bitrix_sync_runs")
    .insert({ user_id: userId, sync_type: syncType, status: "running" })
    .select()
    .single();

  if (error) {
    console.error("[bitrixSupabaseSync] createSyncRun error", error);
    throw error;
  }
  return data;
}

export async function completeSyncRun(runId: string, stats: {
  records_processed?: number;
  records_created?: number;
  records_updated?: number;
}) {
  console.log("[bitrixSupabaseSync] completeSyncRun", { runId, stats });
  const { error } = await supabase
    .from("bitrix_sync_runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      records_processed: stats.records_processed ?? 0,
      records_created: stats.records_created ?? 0,
      records_updated: stats.records_updated ?? 0,
    })
    .eq("id", runId);

  if (error) {
    console.error("[bitrixSupabaseSync] completeSyncRun error", error);
    throw error;
  }
}

export async function failSyncRun(runId: string, message: string) {
  console.log("[bitrixSupabaseSync] failSyncRun", { runId, message });
  const { error } = await supabase
    .from("bitrix_sync_runs")
    .update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    console.error("[bitrixSupabaseSync] failSyncRun error", error);
    throw error;
  }
}
