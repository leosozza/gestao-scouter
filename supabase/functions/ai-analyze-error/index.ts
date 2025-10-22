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
    const { analysis_id } = await req.json();
    
    console.log('🔍 [AI-ANALYZE] Iniciando análise:', analysis_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar análise
    const { data: analysis, error: analysisError } = await supabase
      .from('error_analyses')
      .select('*')
      .eq('id', analysis_id)
      .single();

    if (analysisError || !analysis) {
      throw new Error(`Análise não encontrada: ${analysisError?.message}`);
    }

    console.log('📋 Erro:', analysis.error_type, '|', analysis.error_message);

    // 2. Buscar configuração do provider de IA
    const { data: providerConfig } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', analysis.user_id)
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle();

    const provider = providerConfig?.provider || 'lovable';
    const model = providerConfig?.model || 'google/gemini-2.5-flash';

    console.log('🤖 Provider:', provider, '| Model:', model);

    // 3. Atualizar status para analyzing
    await supabase
      .from('error_analyses')
      .update({ status: 'analyzing' })
      .eq('id', analysis_id);

    // 4. Preparar contexto para IA
    const context = `
Você é um especialista em debug e correção de código. Analise o seguinte erro:

**Tipo de Erro:** ${analysis.error_type}
**Mensagem:** ${analysis.error_message}
**Stack Trace:** ${analysis.error_stack || 'Não disponível'}
**Rota:** ${analysis.route || 'Não especificada'}

**Console Logs:**
${JSON.stringify(analysis.console_logs, null, 2)}

**Network Requests:**
${JSON.stringify(analysis.network_requests, null, 2)}

**Contexto Adicional:**
${JSON.stringify(analysis.error_context, null, 2)}

Analise profundamente este erro e forneça:
1. Causa raiz do problema
2. Impacto do erro
3. 3-5 sugestões de correção (ordenadas por prioridade)

Para cada sugestão de correção, retorne:
- title: título curto e claro
- description: descrição detalhada da correção
- fix_type: tipo (code_change, config_change, dependency_update)
- file_path: caminho do arquivo (se aplicável)
- suggested_code: código corrigido (se aplicável)
- priority: high, medium, low

Retorne em formato JSON válido.
`;

    // 5. Chamar IA baseado no provider
    let aiResponse;
    
    if (provider === 'lovable') {
      aiResponse = await callLovableAI(context, model);
    } else if (provider === 'openai') {
      const apiKey = providerConfig?.api_key_encrypted;
      if (!apiKey) throw new Error('OpenAI API key não configurada');
      aiResponse = await callOpenAI(context, model, apiKey);
    } else if (provider === 'gemini') {
      const apiKey = providerConfig?.api_key_encrypted;
      if (!apiKey) throw new Error('Gemini API key não configurada');
      aiResponse = await callGemini(context, model, apiKey);
    } else {
      throw new Error(`Provider ${provider} não suportado`);
    }

    console.log('✅ Análise completa. Sugestões:', aiResponse.fixes?.length || 0);

    // 6. Salvar resultado
    await supabase
      .from('error_analyses')
      .update({
        status: 'completed',
        analyzed_at: new Date().toISOString(),
        ai_provider: provider,
        ai_model: model,
        analysis_result: aiResponse,
        suggested_fixes: aiResponse.fixes || []
      })
      .eq('id', analysis_id);

    // 7. Criar registros de fix_suggestions
    if (aiResponse.fixes && Array.isArray(aiResponse.fixes)) {
      const suggestions = aiResponse.fixes.map((fix: any) => ({
        analysis_id,
        fix_title: fix.title,
        fix_description: fix.description,
        fix_type: fix.fix_type,
        file_path: fix.file_path,
        suggested_code: fix.suggested_code,
        diff: fix.diff,
        status: 'pending'
      }));

      await supabase
        .from('fix_suggestions')
        .insert(suggestions);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: aiResponse,
        fixes_count: aiResponse.fixes?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [AI-ANALYZE] Erro:', error);
    
    // Atualizar status para failed
    try {
      const { analysis_id } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('error_analyses')
        .update({ 
          status: 'failed',
          metadata: { error: error.message }
        })
        .eq('id', analysis_id);
    } catch {}

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

async function callLovableAI(context: string, model: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert code debugger and problem solver. Always return valid JSON.' },
        { role: 'user', content: context }
      ],
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lovable AI error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse JSON response
  try {
    return JSON.parse(content);
  } catch {
    // Se não for JSON, tentar extrair
    return { root_cause: content, fixes: [] };
  }
}

async function callOpenAI(context: string, model: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an expert code debugger. Return valid JSON only.' },
        { role: 'user', content: context }
      ],
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    return { root_cause: content, fixes: [] };
  }
}

async function callGemini(context: string, model: string, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are an expert code debugger. ${context}\n\nReturn valid JSON only.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${error}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(content);
  } catch {
    return { root_cause: content, fixes: [] };
  }
}
