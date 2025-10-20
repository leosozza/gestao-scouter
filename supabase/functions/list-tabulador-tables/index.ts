/**
 * Edge Function: List TabuladorMax Tables
 * Lists all public tables in TabuladorMax to help diagnose connection issues
 */
import { serve } from "https://deno.land/std@0.193.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
};

/**
 * Quote table name if it contains uppercase letters or spaces
 */
function quoteTableName(name: string): string {
  return /[A-Z\s]/.test(name) && !name.startsWith('"') ? `"${name}"` : name;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [ListTables] Iniciando listagem de tabelas...');
    
    const tabuladorUrl = Deno.env.get('TABULADOR_URL') ?? '';
    const tabuladorKey = Deno.env.get('TABULADOR_SERVICE_KEY') ?? '';
    
    if (!tabuladorUrl || !tabuladorKey) {
      throw new Error('Credenciais do TabuladorMax não configuradas');
    }

    console.log('🔌 [ListTables] Conectando ao TabuladorMax:', tabuladorUrl);
    
    const tabulador = createClient(tabuladorUrl, tabuladorKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'Prefer': 'return=representation',
          'Content-Type': 'application/json',
        },
      },
    });

    // Try to list tables using RPC if available
    const { data: rpcTables, error: rpcError } = await tabulador.rpc('list_public_tables');
    
    const result: any = {
      timestamp: new Date().toISOString(),
      url: tabuladorUrl,
      tables_found: [],
      table_tests: {},
      recommendations: []
    };

    if (!rpcError && rpcTables) {
      console.log('✅ [ListTables] Tabelas listadas via RPC:', rpcTables);
      result.tables_found = rpcTables.map((t: any) => t.table_name);
    } else {
      console.warn('⚠️ [ListTables] RPC list_public_tables não disponível, testando tabelas manualmente');
    }

    // Test common table names
    const commonNames = ['leads', 'Leads', 'LEADS', 'fichas', 'Fichas', 'lead', 'Lead'];
    
    for (const tableName of commonNames) {
      try {
        const quotedName = quoteTableName(tableName);
        const { count, error } = await tabulador
          .from(quotedName)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        if (!error && count !== null) {
          result.table_tests[tableName] = {
            exists: true,
            count: count,
            quoted_name: quotedName,
            status: '✅ Acessível'
          };
          
          if (count > 0) {
            result.recommendations.push(`Tabela "${quotedName}" tem ${count} registros - use este nome na sincronização`);
          }
        } else {
          result.table_tests[tableName] = {
            exists: false,
            error: error?.message || 'Tabela não encontrada',
            status: '❌ Não acessível'
          };
        }
      } catch (err) {
        result.table_tests[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
          status: '❌ Erro ao testar'
        };
      }
    }

    // Add recommendations
    if (result.recommendations.length === 0) {
      result.recommendations.push('Nenhuma tabela com dados encontrada. Verifique:');
      result.recommendations.push('1. Se o SERVICE ROLE KEY está correto');
      result.recommendations.push('2. Se as tabelas existem no schema public');
      result.recommendations.push('3. Se há dados nas tabelas');
      result.recommendations.push('4. Se RLS está permitindo acesso via service role');
    }

    console.log('📊 [ListTables] Resultado:', result);

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ [ListTables] Erro:', message);
    
    return new Response(
      JSON.stringify({ ok: false, error: message }, null, 2),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});