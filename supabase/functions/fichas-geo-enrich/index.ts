/**
 * Edge Function: fichas-geo-enrich
 * Enriquece fichas com geolocalização a partir da coluna "Localização"
 * Auth: header 'X-Secret: SHEETS_SYNC_SHARED_SECRET'
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";

const RE_COORDS = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

function parseFichaLocalizacaoToLatLng(localizacao?: string | null): { lat: number; lng: number } | null {
  if (!localizacao) return null;
  const m = localizacao.match(RE_COORDS);
  if (m) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

async function checkGeocache(query: string, supabaseUrl: string, serviceKey: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`${supabaseUrl}/rest/v1/geocache?query=eq.${encodeURIComponent(query)}`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return { lat: data[0].lat, lng: data[0].lng };
  }
  return null;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // Usando Nominatim (OpenStreetMap)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GestaoScouter/1.0",
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return null;
}

async function saveToGeocache(query: string, lat: number, lng: number, supabaseUrl: string, serviceKey: string) {
  await fetch(`${supabaseUrl}/rest/v1/geocache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query, lat, lng }),
  });
}

async function updateFichaLocation(id: number, lat: number, lng: number, supabaseUrl: string, serviceKey: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/fichas?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ lat, lng }),
  });

  return res.ok;
}

async function enrichFichas(limit: number = 50) {
  const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Buscar fichas sem lat/lng mas com localização
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/fichas?lat=is.null&localizacao=not.is.null&limit=${limit}`,
    {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch fichas");
  }

  const fichas = await res.json();
  let processed = 0;
  let geocoded = 0;
  let fromCache = 0;

  for (const ficha of fichas) {
    const localizacao = ficha.localizacao;
    if (!localizacao) continue;

    // Tentar parse direto de coordenadas
    const coords = parseFichaLocalizacaoToLatLng(localizacao);
    
    if (coords) {
      // É coordenada direta
      const success = await updateFichaLocation(ficha.id, coords.lat, coords.lng, SUPABASE_URL, SERVICE_KEY);
      if (success) {
        processed++;
        geocoded++;
      }
    } else {
      // É endereço, precisa geocodificar
      // Primeiro checar cache
      let geoCoords = await checkGeocache(localizacao, SUPABASE_URL, SERVICE_KEY);
      
      if (geoCoords) {
        fromCache++;
      } else {
        // Geocodificar
        geoCoords = await geocodeAddress(localizacao);
        
        if (geoCoords) {
          // Salvar no cache
          await saveToGeocache(localizacao, geoCoords.lat, geoCoords.lng, SUPABASE_URL, SERVICE_KEY);
          geocoded++;
        }
        
        // Respeitar rate limit do Nominatim (1 req/sec)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (geoCoords) {
        const success = await updateFichaLocation(ficha.id, geoCoords.lat, geoCoords.lng, SUPABASE_URL, SERVICE_KEY);
        if (success) processed++;
      }
    }
  }

  return { processed, geocoded, fromCache, total: fichas.length };
}

serve(async (req) => {
  try {
    const secret = req.headers.get("X-Secret");
    if (secret !== Deno.env.get("SHEETS_SYNC_SHARED_SECRET")) {
      return new Response("forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const result = await enrichFichas(limit);

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
    console.error("Error in fichas-geo-enrich:", error);
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
