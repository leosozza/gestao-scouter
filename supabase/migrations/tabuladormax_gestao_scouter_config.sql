-- ============================================================================
-- Migration: Create gestao_scouter_config table in TabuladorMax
-- ============================================================================
-- ⚠️ ATENÇÃO: Este arquivo deve ser executado MANUALMENTE no projeto TabuladorMax
-- ⚠️ Não pode ser executado via Lovable pois é um projeto externo
-- 
-- Este script cria a tabela gestao_scouter_config no Supabase do TabuladorMax
-- para armazenar as configurações de conexão do Gestão Scouter.
--
-- PASSOS PARA INSTALAÇÃO MANUAL:
-- 1. Acessar: https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf/sql
-- 2. Copiar e colar TODO este arquivo SQL
-- 3. Executar
-- 4. Inserir os dados de configuração (ver seção INSERT abaixo)
--
-- Objetivo: Eliminar o erro 404 ao salvar as configurações de integração
-- ============================================================================

-- ============================================================================
-- Tabela: gestao_scouter_config
-- ============================================================================
-- Esta tabela armazena as configurações de conexão do Gestão Scouter para que
-- o TabuladorMax possa se comunicar de volta com o Gestão Scouter.
--
CREATE TABLE IF NOT EXISTS public.gestao_scouter_config (
  id serial PRIMARY KEY,
  project_url text NOT NULL,
  anon_key text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  sync_enabled boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_project_url CHECK (project_url ~ '^https?://'),
  CONSTRAINT unique_active_config UNIQUE (active) WHERE active = true
);

-- Comentários descritivos
COMMENT ON TABLE public.gestao_scouter_config IS 'Configuração de conexão com o Gestão Scouter';
COMMENT ON COLUMN public.gestao_scouter_config.id IS 'Identificador único da configuração';
COMMENT ON COLUMN public.gestao_scouter_config.project_url IS 'URL do projeto Supabase do Gestão Scouter';
COMMENT ON COLUMN public.gestao_scouter_config.anon_key IS 'Chave pública (anon key) do Gestão Scouter';
COMMENT ON COLUMN public.gestao_scouter_config.active IS 'Indica se esta configuração está ativa (apenas uma pode estar ativa por vez)';
COMMENT ON COLUMN public.gestao_scouter_config.sync_enabled IS 'Indica se a sincronização automática está habilitada';

-- ============================================================================
-- Função: Atualizar timestamp automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_gestao_scouter_config_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS trigger_update_gestao_scouter_config_updated_at ON public.gestao_scouter_config;
CREATE TRIGGER trigger_update_gestao_scouter_config_updated_at
  BEFORE UPDATE ON public.gestao_scouter_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gestao_scouter_config_updated_at();

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================
-- Habilitar RLS na tabela
ALTER TABLE public.gestao_scouter_config ENABLE ROW LEVEL SECURITY;

-- Policy: Permitir SELECT para usuários autenticados e service role
DROP POLICY IF EXISTS "Permitir SELECT para todos" ON public.gestao_scouter_config;
CREATE POLICY "Permitir SELECT para todos"
  ON public.gestao_scouter_config
  FOR SELECT
  TO authenticated, anon, service_role
  USING (true);

-- Policy: Permitir INSERT apenas para service role e autenticados
DROP POLICY IF EXISTS "Permitir INSERT para autenticados" ON public.gestao_scouter_config;
CREATE POLICY "Permitir INSERT para autenticados"
  ON public.gestao_scouter_config
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Policy: Permitir UPDATE apenas para service role e autenticados
DROP POLICY IF EXISTS "Permitir UPDATE para autenticados" ON public.gestao_scouter_config;
CREATE POLICY "Permitir UPDATE para autenticados"
  ON public.gestao_scouter_config
  FOR UPDATE
  TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Permitir DELETE apenas para service role e autenticados
DROP POLICY IF EXISTS "Permitir DELETE para autenticados" ON public.gestao_scouter_config;
CREATE POLICY "Permitir DELETE para autenticados"
  ON public.gestao_scouter_config
  FOR DELETE
  TO authenticated, service_role
  USING (true);

-- ============================================================================
-- Inserir configuração padrão do Gestão Scouter
-- ============================================================================
-- ⚠️ IMPORTANTE: Substitua os valores abaixo pelas credenciais reais do seu
-- projeto Gestão Scouter antes de executar!
--
-- Para encontrar suas credenciais:
-- 1. Acesse: https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt/settings/api
-- 2. Copie a "Project URL" e a "anon/public key"
--
INSERT INTO public.gestao_scouter_config (project_url, anon_key, active, sync_enabled)
VALUES (
  'https://ngestyxtopvfeyenyvgt.supabase.co',  -- Substitua pela URL real
  'sua_anon_key_aqui',  -- Substitua pela anon key real
  true,
  false
)
ON CONFLICT (active) WHERE active = true DO UPDATE
SET 
  project_url = EXCLUDED.project_url,
  anon_key = EXCLUDED.anon_key,
  sync_enabled = EXCLUDED.sync_enabled,
  updated_at = now();

-- ============================================================================
-- Verificação: Conferir se a tabela foi criada corretamente
-- ============================================================================
-- Execute esta query para verificar se tudo está correto:
--
-- SELECT * FROM public.gestao_scouter_config;
--
-- Você deve ver um registro com:
-- - project_url preenchido
-- - anon_key preenchido
-- - active = true
-- - sync_enabled = false (inicialmente)
-- ============================================================================

-- ============================================================================
-- Atualização da função de trigger para usar a tabela
-- ============================================================================
-- Agora você pode atualizar a função sync_lead_to_fichas() para buscar
-- as configurações da tabela gestao_scouter_config ao invés de usar
-- current_setting().
--
-- Exemplo de como modificar a função:
--
-- CREATE OR REPLACE FUNCTION public.sync_lead_to_fichas()
-- RETURNS trigger AS $$
-- DECLARE
--   gestao_url text;
--   gestao_key text;
--   config_record record;
--   payload jsonb;
--   response http_response;
-- BEGIN
--   -- Buscar configuração ativa da tabela
--   SELECT project_url, anon_key INTO config_record
--   FROM public.gestao_scouter_config
--   WHERE active = true AND sync_enabled = true
--   LIMIT 1;
--   
--   -- Validar se encontrou configuração
--   IF config_record IS NULL THEN
--     RAISE WARNING 'Nenhuma configuração ativa encontrada na tabela gestao_scouter_config';
--     RETURN NEW;
--   END IF;
--   
--   gestao_url := config_record.project_url;
--   gestao_key := config_record.anon_key;
--   
--   -- ... resto da lógica permanece igual
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- ============================================================================

-- ============================================================================
-- Instruções Pós-Instalação
-- ============================================================================
-- Após executar este script com sucesso:
--
-- 1. Verifique se a tabela foi criada:
--    SELECT tablename FROM pg_tables WHERE tablename = 'gestao_scouter_config';
--
-- 2. Verifique se o RLS está habilitado:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'gestao_scouter_config';
--
-- 3. Verifique as policies criadas:
--    SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'gestao_scouter_config';
--
-- 4. Teste uma consulta simples:
--    SELECT id, project_url, active, sync_enabled FROM public.gestao_scouter_config;
--
-- 5. Atualize a função sync_lead_to_fichas() para usar esta tabela (ver exemplo acima)
--
-- ============================================================================
