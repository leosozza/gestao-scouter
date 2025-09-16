
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Restricted CORS headers
const ALLOWED_ORIGINS = [
  "https://nwgqynfcglcwwvibaypj.supabase.co",
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ProxyBody {
  baseUrl: string;
  method: string;
  params?: Record<string, any>;
  authMode?: 'webhook' | 'oauth';
  webhookUserId?: string;
  webhookCode?: string;
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}/oauth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get("origin") ?? "";
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }
    
    return new Response(null, { 
      headers: { 
        ...corsHeaders, 
        'Access-Control-Allow-Origin': origin 
      } 
    });
  }

  try {
    const origin = req.headers.get("origin") ?? "";
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Validate JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
      });
    }

    const body: ProxyBody = await req.json();
    
    // Validate baseUrl (allowlist Bitrix domains)
    if (!body.baseUrl || !body.baseUrl.match(/^https:\/\/[a-zA-Z0-9-]+\.bitrix24\.(com|net|org|ru|br)/)) {
      return new Response(JSON.stringify({ error: 'Invalid or unauthorized Bitrix domain' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
      });
    }

    // Get credentials from environment (server-side secrets)
    const CLIENT_ID = Deno.env.get('BITRIX_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('BITRIX_CLIENT_SECRET');
    const REFRESH_TOKEN = Deno.env.get('BITRIX_REFRESH_TOKEN');
    const WEBHOOK_USER_ID = Deno.env.get('BITRIX_WEBHOOK_USER_ID');
    const WEBHOOK_CODE = Deno.env.get('BITRIX_WEBHOOK_CODE');

    let bitrixUrl: string;

    if (body.authMode === 'webhook') {
      if (!WEBHOOK_USER_ID || !WEBHOOK_CODE) {
        return new Response(JSON.stringify({ error: 'Webhook credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
        });
      }
      
      bitrixUrl = `${body.baseUrl}/rest/${WEBHOOK_USER_ID}/${WEBHOOK_CODE}/${body.method}/`;
    } else {
      // OAuth mode
      if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        return new Response(JSON.stringify({ error: 'OAuth credentials not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
        });
      }

      const accessToken = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, body.baseUrl);
      bitrixUrl = `${body.baseUrl}/rest/${body.method}/?auth=${accessToken}`;
    }

    console.log(`Making request to: ${bitrixUrl}`);

    const bitrixResponse = await fetch(bitrixUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.params ? new URLSearchParams(body.params) : undefined,
    });

    const bitrixData = await bitrixResponse.json();

    if (!bitrixResponse.ok) {
      console.error('Bitrix API error:', bitrixData);
      return new Response(JSON.stringify({ 
        error: 'Bitrix API error', 
        details: bitrixData 
      }), {
        status: bitrixResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
      });
    }

    return new Response(JSON.stringify(bitrixData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
