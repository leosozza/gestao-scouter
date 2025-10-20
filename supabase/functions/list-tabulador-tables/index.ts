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
    
    // Validação detalhada de credenciais
    if (!tabuladorUrl || !tabuladorKey) {
      const missingVars = [];
      if (!tabuladorUrl) missingVars.push('TABULADOR_URL');
      if (!tabuladorKey) missingVars.push('TABULADOR_SERVICE_KEY');
      
      console.error('❌ [ListTables] Variáveis de ambiente ausentes:', missingVars.join(', '));
      throw new Error(`Credenciais do TabuladorMax não configuradas. Faltando: ${missingVars.join(', ')}`);
    }

    // Validar formato da URL
    try {
      new URL(tabuladorUrl);
    } catch (urlError) {
      console.error('❌ [ListTables] URL inválida:', tabuladorUrl);
      throw new Error(`TABULADOR_URL inválida: ${tabuladorUrl}. Deve ser uma URL completa (ex: https://project.supabase.co)`);
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

    // Initialize result object
    const result: any = {
      timestamp: new Date().toISOString(),
      url: tabuladorUrl,
      credentials_valid: true,
      rpc_available: false,
      tables_found: [],
      table_tests: {},
      recommendations: [],
      errors: []
    };

    // Try to list tables using RPC if available
    console.log('🔍 [ListTables] Tentando listar tabelas via RPC list_public_tables...');
    const { data: rpcTables, error: rpcError } = await tabulador.rpc('list_public_tables');
    
    if (!rpcError && rpcTables) {
      console.log('✅ [ListTables] RPC list_public_tables disponível:', rpcTables);
      result.rpc_available = true;
      result.tables_found = rpcTables.map((t: any) => t.table_name);
      result.recommendations.push(`RPC list_public_tables funciona! ${result.tables_found.length} tabelas encontradas.`);
    } else {
      console.warn('⚠️ [ListTables] RPC list_public_tables não disponível ou retornou erro:', rpcError?.message);
      result.rpc_available = false;
      result.errors.push(`RPC list_public_tables: ${rpcError?.message || 'Não implementado'}`);
      result.recommendations.push('RPC list_public_tables não está disponível. Testando tabelas manualmente...');
    }

    // Test common table names and variations
    const commonNames = ['leads', 'Leads', 'LEADS', '"leads"', '"Leads"', 'fichas', 'Fichas', 'lead', 'Lead'];
    
    console.log('🔍 [ListTables] Testando nomes comuns de tabelas...');
    for (const tableName of commonNames) {
      try {
        const quotedName = quoteTableName(tableName);
        const testStart = Date.now();
        const { count, error } = await tabulador
          .from(quotedName)
          .select('*', { count: 'exact', head: true })
          .limit(1);

        const testLatency = Date.now() - testStart;

        if (!error && count !== null) {
          result.table_tests[tableName] = {
            exists: true,
            count: count,
            quoted_name: quotedName,
            latency_ms: testLatency,
            status: '✅ Acessível'
          };
          
          console.log(`✅ [ListTables] ${tableName} → ${quotedName}: ${count} registros (${testLatency}ms)`);
          
          if (count > 0) {
            result.recommendations.push(`Tabela "${quotedName}" tem ${count} registros - RECOMENDADO para sincronização`);
          } else {
            result.recommendations.push(`Tabela "${quotedName}" existe mas está vazia`);
          }
        } else {
          result.table_tests[tableName] = {
            exists: false,
            error: error?.message || 'Tabela não encontrada',
            error_code: error?.code,
            latency_ms: testLatency,
            status: '❌ Não acessível'
          };
          console.log(`❌ [ListTables] ${tableName}: ${error?.message} (code: ${error?.code})`);
        }
      } catch (err) {
        result.table_tests[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
          status: '❌ Erro ao testar'
        };
        console.error(`❌ [ListTables] Exceção ao testar ${tableName}:`, err);
      }
    }

    // Add recommendations based on results
    const accessibleTables = Object.entries(result.table_tests)
      .filter(([_, test]: [string, any]) => test.exists && test.count > 0);
    
    if (accessibleTables.length === 0) {
      result.recommendations.push('❌ NENHUMA TABELA COM DADOS ENCONTRADA. Possíveis causas:');
      result.recommendations.push('1. Verifique se TABULADOR_SERVICE_KEY é a SERVICE ROLE KEY (não anon key)');
      result.recommendations.push('2. Verifique se as tabelas existem no schema public do TabuladorMax');
      result.recommendations.push('3. Verifique se há dados nas tabelas');
      result.recommendations.push('4. Verifique as políticas RLS - service role deve ter acesso total');
      result.recommendations.push('5. Teste a conexão diretamente no Supabase SQL Editor');
    } else {
      result.recommendations.push(`✅ ${accessibleTables.length} tabela(s) acessível(is) com dados`);
      const bestTable = accessibleTables.reduce((best, curr) => 
        (curr[1] as any).count > (best[1] as any).count ? curr : best
      );
      result.recommendations.push(`🎯 RECOMENDAÇÃO: Use a tabela "${(bestTable[1] as any).quoted_name}" (${(bestTable[1] as any).count} registros)`);
    }

    // Add summary
    result.summary = {
      total_tables_tested: commonNames.length,
      accessible_tables: accessibleTables.length,
      total_records: accessibleTables.reduce((sum, [_, test]: [string, any]) => sum + test.count, 0),
      rpc_working: result.rpc_available,
      credentials_configured: true
    };

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
    
    // Provide detailed error context
    const errorResult = {
      ok: false,
      error: message,
      timestamp: new Date().toISOString(),
      troubleshooting: [
        '1. Verifique se as variáveis TABULADOR_URL e TABULADOR_SERVICE_KEY estão configuradas no Supabase Dashboard',
        '2. Acesse: Project Settings → Edge Functions → Secrets',
        '3. A URL deve ser completa: https://your-project.supabase.co',
        '4. Use a SERVICE ROLE KEY, não a anon/publishable key',
        '5. Teste a conexão manualmente no SQL Editor do TabuladorMax'
      ]
    };
    
    return new Response(
      JSON.stringify(errorResult, null, 2),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});