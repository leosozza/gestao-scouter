
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthMode = "webhook" | "oauth";

interface ProxyBody {
  baseUrl: string;
  authMode: AuthMode;
  webhookUserId?: string;
  webhookToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  method: string; // ex: "crm.lead.list", "batch"
  params?: Record<string, any>;
}

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/g, ""); // remove barra final
}

async function getAccessToken(baseUrl: string, clientId: string, clientSecret: string, refreshToken: string) {
  const tokenUrl = `${cleanBaseUrl(baseUrl)}/oauth/token/`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OAuth refresh failed (${res.status}): ${text || "unknown error"}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("OAuth refresh did not return access_token");
  }
  return data.access_token as string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ProxyBody;
    const {
      baseUrl,
      authMode,
      webhookUserId,
      webhookToken,
      clientId,
      clientSecret,
      refreshToken,
      method,
      params = {},
    } = body;

    if (!baseUrl || !authMode || !method) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: baseUrl, authMode, method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let url = "";
    const normalizedBase = cleanBaseUrl(baseUrl);

    if (authMode === "webhook") {
      if (!webhookUserId || !webhookToken) {
        return new Response(
          JSON.stringify({ error: "Missing webhookUserId or webhookToken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // ex: https://portal/rest/USER_ID/TOKEN/crm.lead.list.json
      url = `${normalizedBase}/rest/${webhookUserId}/${webhookToken}/${method}.json`;
    } else {
      if (!clientId || !clientSecret || !refreshToken) {
        return new Response(
          JSON.stringify({ error: "Missing clientId, clientSecret or refreshToken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const accessToken = await getAccessToken(normalizedBase, clientId, clientSecret, refreshToken);
      // ex: https://portal/rest/crm.lead.list.json?auth=ACCESS_TOKEN
      url = `${normalizedBase}/rest/${method}.json?auth=${encodeURIComponent(accessToken)}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: Object.keys(params || {}).length ? JSON.stringify(params) : "{}",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Bitrix error (${res.status}): ${text}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("bitrix-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
