/**
 * Edge Function: recebe eventos do Google Apps Script (onEdit/onChange ou batch)
 * e faz UPSERT idempotente em public.fichas.
 * Auth: header 'X-Secret: SHEETS_SYNC_SHARED_SECRET'
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

function parseBRL(input: unknown): number {
  if (input == null) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  const s = String(input).replace(/\s/g,'').replace(/[Rr]\$?/g,'').replace(/\./g,'').replace(/,/g,'.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normString(v: any): string {
  return (v ?? "").toString().trim();
}

function toISODatePossiblyBR(s: any): string | null {
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(str);
  return isNaN(+d) ? null : d.toISOString().slice(0,10);
}

async function upsertRows(rows: any[]) {
  const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const expectedCols = (Deno.env.get("SHEETS_EXPECTED_COLUMNS") || "").split(",").map(s=>s.trim()).filter(Boolean);

  const payload = rows.map((r) => {
    // escolher colunas (com variações conhecidas)
    const id =
      r["ID"] ?? r["Id"] ?? r["id"] ?? r["Id_Ficha"] ?? r["Ficha_ID"];
    const scouter =
      r["Gestão de Scouter"] ?? r["Scouter"] ?? r["Gestão do Scouter"] ?? r["Gestao de Scouter"] ?? r["Gestão de  Scouter"];
    const projeto =
      r["Projetos Cormeciais"] ?? r["Projetos Comerciais"] ?? r["Projetos"] ?? r["Projeto"];
    const criado =
      r["Criado"] ?? r["Data_criacao_Ficha"] ?? r["Data"] ?? r["criado"];
    const valor =
      r["Valor por Fichas"] ?? r["Valor Ficha"] ?? r["R$/Ficha"] ?? r["Valor por Ficha"] ?? r["Valor_ficha"] ?? r["Valor"];

    const createdISO = toISODatePossiblyBR(criado);
    const valorNum = parseBRL(valor);

    return {
      id: String(id ?? "").trim(),
      raw: r,
      scouter: normString(scouter),
      projeto: normString(projeto),
      criado: createdISO,
      valor_ficha: valorNum || null,
      deleted: false
    };
  }).filter(x => x.id);

  if (!payload.length) return { upserted: 0 };

  // split em lotes de 500
  const chunks: typeof payload[] = [];
  for (let i=0;i<payload.length;i+=500) chunks.push(payload.slice(i,i+500));

  let total = 0;
  for (const chunk of chunks) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fichas?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`upsert fichas failed ${res.status}: ${txt}`);
    }
    const json = await res.json();
    total += (json?.length || 0);
  }
  return { upserted: total };
}

serve(async (req) => {
  try {
    const secret = req.headers.get("X-Secret");
    if (secret !== Deno.env.get("SHEETS_SYNC_SHARED_SECRET")) {
      return new Response("forbidden", { status: 403 });
    }
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const result = await upsertRows(rows);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(`error:${message}`, { status: 500 });
  }
});