/**
 * Edge Function: bitrix-lead-upsert
 * 
 * Recebe webhooks do Bitrix24 quando leads são criados ou atualizados
 * e faz UPSERT na tabela bitrix_leads do Supabase.
 * 
 * Autenticação: Header 'X-Secret: BITRIX_WEBHOOK_SECRET'
 * 
 * Payload esperado do Bitrix24:
 * {
 *   "event": "ONCRMLEADADD" | "ONCRMLEADUPDATE",
 *   "data": {
 *     "FIELDS": {
 *       "ID": "123",
 *       "TITLE": "Lead Title",
 *       "NAME": "First Name",
 *       "LAST_NAME": "Last Name",
 *       "STAGE_ID": "NEW",
 *       "DATE_CREATE": "2025-01-01T12:00:00+00:00",
 *       "PHONE": [{"VALUE": "1234567890"}],
 *       "EMAIL": [{"VALUE": "test@example.com"}],
 *       "UF_CRM_*": "custom fields"
 *     }
 *   }
 * }
 */

import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

// Helper to normalize phone arrays from Bitrix
function extractPhone(phoneArray: any): string {
  if (!phoneArray || !Array.isArray(phoneArray)) return '';
  const phone = phoneArray.find((p: any) => p.VALUE);
  return phone?.VALUE || '';
}

// Helper to normalize email arrays from Bitrix
function extractEmail(emailArray: any): string {
  if (!emailArray || !Array.isArray(emailArray)) return '';
  const email = emailArray.find((e: any) => e.VALUE);
  return email?.VALUE || '';
}

// Helper to normalize strings
function normString(v: any): string {
  return (v ?? "").toString().trim();
}

// Helper to parse date from Bitrix (ISO format)
function parseDate(dateStr: any): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

async function upsertLead(leadData: any) {
  const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Extract fields from Bitrix24 lead
  const fields = leadData.FIELDS || leadData;
  
  // Map Bitrix24 fields to our database schema
  const payload = {
    bitrix_id: parseInt(fields.ID || fields.id, 10),
    etapa: normString(fields.STAGE_ID || fields.etapa),
    data_de_criacao_da_ficha: parseDate(fields.DATE_CREATE || fields.data_de_criacao_da_ficha),
    primeiro_nome: normString(fields.NAME || fields.primeiro_nome),
    nome_do_modelo: normString(fields.TITLE || fields.nome_do_modelo),
    foto_do_modelo: normString(fields.UF_CRM_FOTO || fields.foto_do_modelo),
    telefone_de_trabalho: extractPhone(fields.PHONE) || normString(fields.telefone_de_trabalho),
    celular: extractPhone(fields.MOBILE_PHONE) || normString(fields.celular),
    local_da_abordagem: normString(fields.UF_CRM_LOCAL_ABORDAGEM || fields.local_da_abordagem),
    endereco: normString(fields.ADDRESS || fields.endereco),
    numero: normString(fields.UF_CRM_NUMERO || fields.numero),
    complemento: normString(fields.UF_CRM_COMPLEMENTO || fields.complemento),
    bairro: normString(fields.UF_CRM_BAIRRO || fields.bairro),
    cidade: normString(fields.ADDRESS_CITY || fields.cidade),
    uf: normString(fields.ADDRESS_PROVINCE || fields.uf),
    cep: normString(fields.ADDRESS_POSTAL_CODE || fields.cep),
    ponto_de_referencia: normString(fields.UF_CRM_PONTO_REFERENCIA || fields.ponto_de_referencia),
    altura_cm: normString(fields.UF_CRM_ALTURA || fields.altura_cm),
    medida_do_busto: normString(fields.UF_CRM_BUSTO || fields.medida_do_busto),
    medida_da_cintura: normString(fields.UF_CRM_CINTURA || fields.medida_da_cintura),
    medida_do_quadril: normString(fields.UF_CRM_QUADRIL || fields.medida_do_quadril),
    manequim_de_roupa: normString(fields.UF_CRM_MANEQUIM || fields.manequim_de_roupa),
    numero_do_calcado: normString(fields.UF_CRM_CALCADO || fields.numero_do_calcado),
    cor_dos_olhos: normString(fields.UF_CRM_COR_OLHOS || fields.cor_dos_olhos),
    cor_do_cabelo: normString(fields.UF_CRM_COR_CABELO || fields.cor_do_cabelo),
    lead_score: normString(fields.UF_CRM_SCORE || fields.lead_score),
  };

  if (!payload.bitrix_id || isNaN(payload.bitrix_id)) {
    throw new Error("Invalid or missing Bitrix ID");
  }

  // Upsert lead using Supabase REST API with conflict resolution
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bitrix_leads?on_conflict=bitrix_id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upsert bitrix_leads failed ${res.status}: ${txt}`);
  }

  const result = await res.json();
  return result;
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Secret",
      },
    });
  }

  let eventType = "";
  let bitrixId = 0;
  let payload: any = {};

  try {
    // Verify authentication
    const secret = req.headers.get("X-Secret");
    const expectedSecret = Deno.env.get("BITRIX_WEBHOOK_SECRET") || 
                          Deno.env.get("SHEETS_SYNC_SHARED_SECRET");
    
    if (secret !== expectedSecret) {
      console.error("Authentication failed: invalid secret");
      return new Response("Forbidden", { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    payload = body;
    eventType = body.event || "UNKNOWN";
    console.log("Bitrix webhook received:", JSON.stringify(body, null, 2));

    // Extract lead data from Bitrix24 webhook format
    // Bitrix sends: { event: "ONCRMLEADADD", data: { FIELDS: {...} } }
    let leadData = body;
    
    if (body.data && body.data.FIELDS) {
      // Standard Bitrix24 webhook format
      leadData = body.data.FIELDS;
    } else if (body.FIELDS) {
      // Direct FIELDS format
      leadData = body.FIELDS;
    } else if (body.data) {
      // Data wrapper only
      leadData = body.data;
    }

    // Upsert the lead
    const result = await upsertLead(leadData);
    bitrixId = leadData.FIELDS?.ID || leadData.ID || 0;

    const processingTime = Date.now() - startTime;
    console.log(`Lead upserted successfully in ${processingTime}ms:`, result);

    // Optional: Log successful webhook processing
    await logWebhookEvent(eventType, bitrixId, payload, true, null, processingTime);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lead synchronized successfully",
        result,
        processingTime,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const processingTime = Date.now() - startTime;
    
    console.error("Error processing Bitrix webhook:", message);
    console.error("Stack trace:", e instanceof Error ? e.stack : "");
    
    // Optional: Log failed webhook processing
    await logWebhookEvent(eventType, bitrixId, payload, false, message, processingTime);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// Optional logging function - logs to bitrix_webhook_logs table if it exists
async function logWebhookEvent(
  eventType: string,
  bitrixId: number,
  payload: any,
  success: boolean,
  errorMessage: string | null,
  processingTimeMs: number
) {
  try {
    const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SERVICE_KEY) return;

    await fetch(`${SUPABASE_URL}/rest/v1/bitrix_webhook_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        event_type: eventType,
        bitrix_id: bitrixId || null,
        payload,
        success,
        error_message: errorMessage,
        processing_time_ms: processingTimeMs,
      }),
    });
  } catch (logError) {
    // Don't fail the webhook if logging fails
    console.warn("Failed to log webhook event:", logError);
  }
}
