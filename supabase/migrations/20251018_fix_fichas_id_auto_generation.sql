-- ============================================================================
-- Migration: Fix fichas table 'id' field to auto-generate UUIDs
-- ============================================================================
-- Data: 2025-10-18
-- Descrição: Corrige o campo 'id' da tabela 'fichas' para gerar valores
--            automaticamente usando UUID, resolvendo o erro de constraint
--            NOT NULL quando inserindo novos leads sem fornecer 'id'.
--
-- Problema: O campo 'id' estava definido como 'text primary key' sem default,
--           causando erro ao tentar inserir registros sem fornecer o 'id'.
--
-- Solução: Alterar o tipo para UUID e adicionar DEFAULT gen_random_uuid()
--          para geração automática de IDs únicos.
--
-- Estratégia:
-- 1. Preservar dados existentes convertendo texto para UUID quando possível
-- 2. Criar coluna temporária com UUID e default
-- 3. Migrar dados existentes (se houver)
-- 4. Substituir a coluna antiga pela nova
-- 5. Recriar constraints e índices
-- ============================================================================

-- Habilitar extensão UUID se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ETAPA 1: Backup e preparação
-- ============================================================================

-- Criar uma coluna temporária para o novo ID
ALTER TABLE public.fichas 
ADD COLUMN IF NOT EXISTS id_new UUID DEFAULT gen_random_uuid();

-- ============================================================================
-- ETAPA 2: Migração de dados existentes
-- ============================================================================

-- Para registros existentes, tentar converter o id texto para UUID
-- Se não for possível, gerar um novo UUID
DO $$
DECLARE
  rec RECORD;
  new_uuid UUID;
BEGIN
  -- Verificar se há dados na tabela
  IF EXISTS (SELECT 1 FROM public.fichas LIMIT 1) THEN
    RAISE NOTICE 'Migrando IDs existentes...';
    
    -- Iterar sobre os registros existentes
    FOR rec IN SELECT id, id_new FROM public.fichas WHERE id IS NOT NULL
    LOOP
      BEGIN
        -- Tentar converter o ID texto existente para UUID
        -- Se o ID já for um UUID válido, mantê-lo
        new_uuid := rec.id::UUID;
        UPDATE public.fichas SET id_new = new_uuid WHERE id = rec.id;
        RAISE NOTICE 'ID convertido: % -> %', rec.id, new_uuid;
      EXCEPTION WHEN OTHERS THEN
        -- Se a conversão falhar, o UUID já gerado será usado
        RAISE NOTICE 'ID não é UUID válido, usando novo UUID: % -> %', rec.id, rec.id_new;
      END;
    END LOOP;
    
    RAISE NOTICE 'Migração de IDs concluída';
  ELSE
    RAISE NOTICE 'Tabela fichas está vazia, nenhuma migração de dados necessária';
  END IF;
END $$;

-- ============================================================================
-- ETAPA 3: Substituir a coluna antiga
-- ============================================================================

-- Remover a constraint de chave primária antiga
ALTER TABLE public.fichas DROP CONSTRAINT IF EXISTS fichas_pkey;

-- Remover a coluna antiga
ALTER TABLE public.fichas DROP COLUMN IF EXISTS id;

-- Renomear a nova coluna para 'id'
ALTER TABLE public.fichas RENAME COLUMN id_new TO id;

-- Adicionar a constraint NOT NULL
ALTER TABLE public.fichas ALTER COLUMN id SET NOT NULL;

-- Recriar a chave primária
ALTER TABLE public.fichas ADD PRIMARY KEY (id);

-- ============================================================================
-- ETAPA 4: Adicionar comentário para documentação
-- ============================================================================

COMMENT ON COLUMN public.fichas.id IS 'Identificador único da ficha (UUID gerado automaticamente)';

-- ============================================================================
-- ETAPA 5: Verificação da migração
-- ============================================================================

DO $$
DECLARE
  id_type TEXT;
  has_default BOOLEAN;
  is_not_null BOOLEAN;
BEGIN
  -- Verificar o tipo da coluna
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  -- Verificar se tem default
  SELECT column_default IS NOT NULL INTO has_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  -- Verificar se é NOT NULL
  SELECT is_nullable = 'NO' INTO is_not_null
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fichas'
    AND column_name = 'id';
  
  IF id_type = 'uuid' AND has_default AND is_not_null THEN
    RAISE NOTICE '✅ Migration concluída com sucesso!';
    RAISE NOTICE '✅ Tipo da coluna id: %', id_type;
    RAISE NOTICE '✅ Default value: Sim (gen_random_uuid())';
    RAISE NOTICE '✅ NOT NULL constraint: Sim';
    RAISE NOTICE 'ℹ️ O campo id agora será gerado automaticamente para novos registros';
  ELSE
    RAISE WARNING '⚠️ Verificação falhou:';
    RAISE WARNING '   - Tipo: % (esperado: uuid)', id_type;
    RAISE WARNING '   - Default: % (esperado: true)', has_default;
    RAISE WARNING '   - NOT NULL: % (esperado: true)', is_not_null;
  END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- Notas:
-- - Esta migration converte o campo 'id' de TEXT para UUID
-- - IDs existentes que forem UUIDs válidos serão preservados
-- - IDs existentes que não forem UUIDs válidos receberão novos UUIDs
-- - Novos registros terão IDs gerados automaticamente via gen_random_uuid()
-- - A aplicação não precisa mais fornecer 'id' ao inserir registros
-- ============================================================================
