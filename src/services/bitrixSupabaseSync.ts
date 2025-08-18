
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

  // Formatos do Bitrix24
  const patterns = [
    "yyyy-MM-dd'T'HH:mm:ssXXX", // ISO format
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd",
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy",
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

  console.warn("Could not parse date:", input);
  return null;
}

function mapBitrixLeadToSupabase(raw: BitrixRawLead) {
  console.log("Mapping Bitrix lead:", raw);
  
  const bitrix_id = Number(raw?.ID);
  if (!Number.isFinite(bitrix_id)) {
    console.warn("Invalid Bitrix ID:", raw?.ID);
    return null;
  }

  // Mapear campos do Bitrix para nossa estrutura
  const mapped = {
    bitrix_id,
    etapa: raw?.STAGE_ID || raw?.Etapa || null,
    data_de_criacao_da_ficha: normalizeDateTime(raw?.DATE_CREATE || raw?.Data_de_criacao_da_Ficha),
    primeiro_nome: raw?.NAME || raw?.Primeiro_nome || null,
    nome_do_modelo: raw?.LAST_NAME || raw?.Nome_do_Modelo || raw?.TITLE || null,
    foto_do_modelo: raw?.Foto_do_modelo || null,
    telefone_de_trabalho: raw?.PHONE?.[0]?.VALUE || raw?.Telefone_de_trabalho || null,
    celular: raw?.MOBILE_PHONE?.[0]?.VALUE || raw?.Celular || null,
    local_da_abordagem: raw?.Local_da_Abordagem || null,
    op_telemarketing: raw?.Op_Telemarketing || null,
    ficha_confirmada: raw?.Ficha_confirmada || null,
    cadastro_existe_foto: raw?.Cadastro_Existe_Foto || null,
    scouter: raw?.Scouter || null,
    idade: raw?.Idade ? Number(raw.Idade) : null,
    agencia_e_seletivas: raw?.Agencia_e_Seletivas || null,
    alerta: raw?.Alerta || null,
    valor_da_ficha: raw?.Valor_da_Ficha || null,
    status_da_ficha: raw?.Status_da_Ficha || null,
    fonte: raw?.Fonte || raw?.SOURCE_ID || null,
    gerenciamento_funil: raw?.Gerenciamento_funil || null,
    etapa_funil: raw?.Etapa_funil || null,
    supervisor_do_scouter: raw?.Supervisor_do_Scouter || null,
    presenca_confirmada: raw?.Presenca_confirmada || null,
    data_do_agendamento: normalizeDateTime(raw?.Data_do_agendamento),
    lead_score: raw?.Lead_Score || null,
  };

  console.log("Mapped lead:", mapped);
  return mapped;
}

export async function syncLeadsToSupabase(rawLeads: BitrixRawLead[]): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> {
  console.log("[bitrixSupabaseSync] syncLeadsToSupabase: received", rawLeads?.length || 0, "leads");
  
  if (!rawLeads || rawLeads.length === 0) {
    return { processed: 0, created: 0, updated: 0, errors: 0 };
  }

  const mappedLeads = rawLeads
    .map(mapBitrixLeadToSupabase)
    .filter((lead): lead is NonNullable<ReturnType<typeof mapBitrixLeadToSupabase>> => 
      lead !== null && Number.isFinite(lead.bitrix_id)
    );

  console.log("[bitrixSupabaseSync] Mapped leads:", mappedLeads.length);

  if (mappedLeads.length === 0) {
    return { processed: 0, created: 0, updated: 0, errors: 0 };
  }

  try {
    // Primeiro, vamos verificar quais leads já existem
    const existingIds = mappedLeads.map(lead => lead.bitrix_id);
    const { data: existingLeads, error: selectError } = await supabase
      .from("bitrix_leads")
      .select("bitrix_id")
      .in("bitrix_id", existingIds);

    if (selectError) {
      console.error("Error checking existing leads:", selectError);
      throw selectError;
    }

    const existingBitrixIds = new Set(existingLeads?.map(lead => lead.bitrix_id) || []);
    const newLeads = mappedLeads.filter(lead => !existingBitrixIds.has(lead.bitrix_id));
    const updateLeads = mappedLeads.filter(lead => existingBitrixIds.has(lead.bitrix_id));

    let created = 0;
    let updated = 0;
    let errors = 0;

    // Inserir novos leads
    if (newLeads.length > 0) {
      const { error: insertError } = await supabase
        .from("bitrix_leads")
        .insert(newLeads);

      if (insertError) {
        console.error("Error inserting new leads:", insertError);
        errors += newLeads.length;
      } else {
        created = newLeads.length;
        console.log("Inserted", created, "new leads");
      }
    }

    // Atualizar leads existentes
    if (updateLeads.length > 0) {
      for (const lead of updateLeads) {
        const { error: updateError } = await supabase
          .from("bitrix_leads")
          .update({
            ...lead,
            updated_at: new Date().toISOString()
          })
          .eq("bitrix_id", lead.bitrix_id);

        if (updateError) {
          console.error("Error updating lead:", lead.bitrix_id, updateError);
          errors++;
        } else {
          updated++;
        }
      }
      console.log("Updated", updated, "existing leads");
    }

    return {
      processed: mappedLeads.length,
      created,
      updated,
      errors
    };

  } catch (error) {
    console.error("[bitrixSupabaseSync] Error syncing leads:", error);
    throw error;
  }
}

export async function createSyncRun(userId: string, syncType: string) {
  console.log("[bitrixSupabaseSync] createSyncRun", { userId, syncType });
  const { data, error } = await supabase
    .from("bitrix_sync_runs")
    .insert({ 
      user_id: userId, 
      sync_type: syncType,
      status: "running",
      started_at: new Date().toISOString()
    })
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
  records_failed?: number;
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
      records_failed: stats.records_failed ?? 0,
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
