-- ============================================================================
-- 20251005_tab_max_exposure.sql
-- Views públicas para sincronização com TabuladorMax
-- ============================================================================
-- Este script cria views públicas que expõem as tabelas relevantes
-- para sincronização com o TabuladorMax via Edge Function

-- View pública de fichas (sem dados sensíveis)
CREATE OR REPLACE VIEW public.fichas_sync AS
SELECT 
  id,
  scouter,
  projeto,
  criado,
  valor_ficha,
  deleted,
  aprovado,
  created_at,
  updated_at,
  -- Extrair campos específicos do raw JSONB
  raw->>'nome' AS nome,
  raw->>'idade' AS idade,
  raw->>'telefone' AS telefone,
  raw->>'email' AS email,
  raw->>'etapa' AS etapa,
  raw->>'local_da_abordagem' AS local_da_abordagem,
  raw->>'ficha_confirmada' AS ficha_confirmada,
  raw->>'presenca_confirmada' AS presenca_confirmada,
  raw->>'supervisor_do_scouter' AS supervisor_do_scouter
FROM public.fichas
WHERE deleted = false;

-- View pública de leads (para sincronização bidirecional)
CREATE OR REPLACE VIEW public.leads_sync AS
SELECT 
  id,
  name,
  age,
  scouter,
  responsible,
  etapa,
  criado,
  ficha_confirmada,
  presenca_confirmada,
  compareceu,
  aprovado,
  valor_ficha,
  local_abordagem,
  sync_source,
  sync_status,
  last_sync_at,
  created_at,
  updated_at
FROM public.leads
WHERE deleted = false;

-- View de configuração do TabuladorMax
CREATE OR REPLACE VIEW public.tabulador_config_sync AS
SELECT 
  id,
  project_id,
  url,
  enabled,
  created_at,
  updated_at
FROM public.tabulador_config
WHERE enabled = true;

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_fichas_sync_updated ON public.fichas(updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_leads_sync_updated ON public.leads(updated_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_fichas_sync_source ON public.fichas((raw->>'sync_source'));

-- RLS para views (permitir leitura via service_role)
-- Nota: Edge Functions usam service_role e podem acessar diretamente

-- Comentários para documentação
COMMENT ON VIEW public.fichas_sync IS 'View pública de fichas para sincronização com TabuladorMax';
COMMENT ON VIEW public.leads_sync IS 'View pública de leads para sincronização bidirecional';
COMMENT ON VIEW public.tabulador_config_sync IS 'Configuração ativa do TabuladorMax';

-- Grant select to service_role and authenticated
GRANT SELECT ON public.fichas_sync TO service_role, authenticated;
GRANT SELECT ON public.leads_sync TO service_role, authenticated;
GRANT SELECT ON public.tabulador_config_sync TO service_role, authenticated;

-- Função auxiliar para introspecção de schema
-- Permite à Edge Function descobrir colunas disponíveis dinamicamente
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    column_name::TEXT,
    data_type::TEXT,
    is_nullable::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1
  ORDER BY ordinal_position;
$$;

COMMENT ON FUNCTION public.get_table_columns IS 'Retorna as colunas de uma tabela para introspecção de schema';
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO service_role, authenticated;
