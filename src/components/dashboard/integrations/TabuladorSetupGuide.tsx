import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Code,
  Database,
  Plug,
  ArrowRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  details?: string;
  code?: string;
  link?: string;
}

export function TabuladorSetupGuide() {
  const { toast } = useToast();
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const tabuladorProjectUrl = 'https://lovable.dev/projects/fa1475f9-ea99-4684-a990-84bdf96f348a';

  const steps: SetupStep[] = [
    {
      id: 'step1',
      title: '1. Criar Edge Function: get-leads-count',
      description: 'Esta função retorna a contagem total de leads do TabuladorMax',
      status: 'pending',
      code: `// supabase/functions/get-leads-count/index.ts
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({
        success: true,
        total_leads: count,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})`,
      link: tabuladorProjectUrl
    },
    {
      id: 'step2',
      title: '2. Criar Edge Function: get-leads-for-sync',
      description: 'Esta função retorna leads para sincronização baseado em data de atualização',
      status: 'pending',
      code: `// supabase/functions/get-leads-for-sync/index.ts
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lastSyncDate, limit = 5000 } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .gte('updated_at', lastSyncDate || '1970-01-01')
      .order('updated_at', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    
    return new Response(
      JSON.stringify({
        success: true,
        leads: data,
        total: count,
        synced_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})`,
      link: tabuladorProjectUrl
    },
    {
      id: 'step3',
      title: '3. Executar SQL no TabuladorMax',
      description: 'Adicionar coluna updated_at e trigger automático',
      status: 'pending',
      code: `-- 1. Adicionar coluna updated_at
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Popular com dados existentes
UPDATE public.leads
SET updated_at = COALESCE(updated_at, modificado, criado, NOW())
WHERE updated_at IS NULL;

-- 3. Criar índice
CREATE INDEX IF NOT EXISTS idx_leads_updated_at 
ON public.leads(updated_at DESC);

-- 4. Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();`,
      link: tabuladorProjectUrl,
      details: 'Execute este SQL no SQL Editor do TabuladorMax'
    }
  ];

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    toast({
      title: 'Copiado!',
      description: 'Código copiado para a área de transferência',
    });
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'in-progress':
        return <AlertCircle className="h-5 w-5 text-warning animate-pulse" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Plug className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuração Necessária:</strong> Os erros que você está vendo ocorrem porque 
          o projeto TabuladorMax ainda não tem as Edge Functions necessárias. Siga os passos abaixo 
          para configurar a sincronização.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Guia de Configuração TabuladorMax
          </CardTitle>
          <CardDescription>
            Complete estes passos no projeto TabuladorMax para habilitar a sincronização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-3">
              <div className="flex items-start gap-3">
                {getStatusIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{step.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {step.status === 'completed' ? 'Completo' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.details && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{step.details}</p>
                  )}
                </div>
              </div>

              {step.code && (
                <div className="ml-8 space-y-2">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-[300px] overflow-y-auto">
                      <code>{step.code}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(step.code!, step.id)}
                    >
                      {copiedStep === step.id ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>

                  {step.link && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => window.open(step.link, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir TabuladorMax
                    </Button>
                  )}
                </div>
              )}

              {index < steps.length - 1 && (
                <div className="ml-2 flex items-center gap-2 text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-xs">Próximo passo</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Após completar todos os passos, volte aqui e clique em 
          "Testar Conexão" para verificar se a configuração está correta.
        </AlertDescription>
      </Alert>
    </div>
  );
}
