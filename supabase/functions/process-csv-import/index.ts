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
    const { job_id } = await req.json();
    
    console.log('🚀 [process-csv-import] Iniciando processamento do job:', job_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar job
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job não encontrado: ${jobError?.message}`);
    }

    console.log('📋 Job encontrado:', job.file_name);

    // 2. Atualizar status para processing
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString() 
      })
      .eq('id', job_id);

    // 3. Iniciar processamento em background
    EdgeRuntime.waitUntil((async () => {
      try {
        console.log('📥 Baixando arquivo do storage...');
        
        // Download arquivo do storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('csv-imports')
          .download(job.file_path);

        if (downloadError) {
          throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
        }

        const csvText = await fileData.text();
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        
        console.log(`📊 Total de linhas no CSV: ${lines.length - 1}`);

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').replace(/\r/g, ''));

        // Atualizar total de linhas
        await supabase
          .from('import_jobs')
          .update({ total_rows: lines.length - 1 })
          .eq('id', job_id);

        // Processar em chunks de 1000 registros
        const CHUNK_SIZE = 1000;
        let processed = 0;
        let inserted = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
          const chunk = lines.slice(i, Math.min(i + CHUNK_SIZE, lines.length));
          
          const records = chunk.map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, '').replace(/\r/g, ''));
            const record: any = {};
            
            // Aplicar column_mapping do job
            Object.entries(job.column_mapping as Record<string, string>).forEach(([csvCol, dbCol]) => {
              const idx = headers.indexOf(csvCol);
              if (idx >= 0 && values[idx]) {
                record[dbCol] = values[idx];
              }
            });
            
            return record;
          }).filter(r => Object.keys(r).length > 0);

          console.log(`📦 Processando chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${records.length} registros`);

          // Insert batch
          const { error: insertError } = await supabase
            .from(job.target_table)
            .insert(records);

          if (insertError) {
            failed += records.length;
            const errorMsg = `Chunk ${i}-${i + chunk.length}: ${insertError.message}`;
            errors.push(errorMsg);
            console.error('❌', errorMsg);
          } else {
            inserted += records.length;
          }

          processed += records.length;

          // Atualizar progresso a cada chunk
          await supabase
            .from('import_jobs')
            .update({
              processed_rows: processed,
              inserted_rows: inserted,
              failed_rows: failed,
              errors: errors.slice(0, 100) // Limitar a 100 erros
            })
            .eq('id', job_id);
        }

        // Finalizar job
        await supabase
          .from('import_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            processed_rows: processed,
            inserted_rows: inserted,
            failed_rows: failed
          })
          .eq('id', job_id);

        // Deletar arquivo do storage após processamento
        await supabase.storage
          .from('csv-imports')
          .remove([job.file_path]);

        console.log(`✅ Importação concluída: ${inserted} inseridos, ${failed} falharam`);

      } catch (error) {
        console.error('❌ Erro no processamento:', error);
        await supabase
          .from('import_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', job_id);
      }
    })());

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Processamento iniciado em background',
        job_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ [process-csv-import] Erro:', error);
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
