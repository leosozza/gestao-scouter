/**
 * Edge Function: sheets-locations-sync
 * Sincroniza localizações de scouters do Google Sheets (Grid 1351167110)
 * Auth: header 'X-Secret: SHEETS_SYNC_SHARED_SECRET'
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

// Parser de coordenadas (aceita vários formatos)
export function parseLatLng(raw: string): { lat: number | null; lng: number | null } {
  if (!raw) return { lat: null, lng: null };
  // remove sufixos " (, )" e espaços extras
  const clean = raw.replace(/\(\s*,\s*\)/g, "").trim();
  // encontra dois números com sinal
  const m = clean.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return { lat: null, lng: null };
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return { lat: null, lng: null };
}

function normString(v: any): string {
  if (v == null) return "";
  return String(v).trim();
}

async function syncScouterLocations(rows: any[]) {
  const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let upsertedScouters = 0;
  let insertedLocations = 0;

  for (const row of rows) {
    const scouterName = normString(row["scouter"] ?? row["Scouter"] ?? row["Nome"]);
    const coordsRaw = normString(row["coords_raw"] ?? row["Coordenadas"] ?? row["coords"]);
    const tier = normString(row["tier"] ?? row["Tier"] ?? row["Bronze"]);

    if (!scouterName) continue;

    const coords = parseLatLng(coordsRaw);
    
    // 1. Upsert scouter
    const scouterRes = await fetch(`${SUPABASE_URL}/rest/v1/scouters?on_conflict=name`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        name: scouterName,
        tier: tier || null,
      }),
    });

    if (!scouterRes.ok) {
      const txt = await scouterRes.text();
      console.error(`Failed to upsert scouter ${scouterName}: ${txt}`);
      continue;
    }

    const scouterData = await scouterRes.json();
    const scouterId = Array.isArray(scouterData) ? scouterData[0]?.id : scouterData?.id;
    
    if (scouterId) {
      upsertedScouters++;
    }

    // 2. Insert location if coords are valid
    if (coords.lat !== null && coords.lng !== null && scouterId) {
      const locationRes = await fetch(`${SUPABASE_URL}/rest/v1/scouter_locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Prefer": "return=representation",
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          scouter_id: scouterId,
          lat: coords.lat,
          lng: coords.lng,
          source: "sheet",
        }),
      });

      if (!locationRes.ok) {
        const txt = await locationRes.text();
        console.error(`Failed to insert location for scouter ${scouterName}: ${txt}`);
      } else {
        insertedLocations++;
      }
    }
  }

  return { upsertedScouters, insertedLocations };
}

async function fetchSheetData(gid: string): Promise<any[]> {
  const SHEETS_ID = Deno.env.get("SHEETS_ID");
  if (!SHEETS_ID) {
    throw new Error("SHEETS_ID not configured");
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status}`);
  }

  const csvText = await response.text();
  const lines = csvText.split("\n").filter(l => l.trim());
  
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    rows.push(obj);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

serve(async (req) => {
  try {
    const secret = req.headers.get("X-Secret");
    if (secret !== Deno.env.get("SHEETS_SYNC_SHARED_SECRET")) {
      return new Response("forbidden", { status: 403 });
    }

    // Grid fixo: 1351167110
    const SCOUTER_LOCATIONS_GID = "1351167110";
    
    const rows = await fetchSheetData(SCOUTER_LOCATIONS_GID);
    const result = await syncScouterLocations(rows);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in sheets-locations-sync:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
