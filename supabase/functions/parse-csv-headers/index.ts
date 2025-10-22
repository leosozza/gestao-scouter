import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_path } = await req.json();
    
    console.log('📄 [parse-csv-headers] Analisando arquivo:', file_path);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download apenas primeiros 100KB do arquivo
    const { data, error } = await supabase.storage
      .from('csv-imports')
      .download(file_path);

    if (error) {
      console.error('❌ Erro ao fazer download:', error);
      throw error;
    }

    // Ler apenas primeiras 10 linhas
    const text = await data.text();
    const lines = text.split('\n').slice(0, 10);
    
    if (lines.length === 0) {
      throw new Error('Arquivo CSV vazio');
    }

    // Extrair cabeçalhos (primeira linha)
    const headers = lines[0]
      .split(',')
      .map(h => h.trim().replace(/"/g, '').replace(/\r/g, ''));

    // Extrair dados de amostra (próximas 5 linhas)
    const sampleData = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, '').replace(/\r/g, ''))
    );

    console.log('✅ Cabeçalhos extraídos:', headers.length);

    return new Response(
      JSON.stringify({
        success: true,
        headers,
        sampleData,
        totalSampleLines: lines.length - 1
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [parse-csv-headers] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
