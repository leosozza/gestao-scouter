-- ============================================================================
-- Validation Tests for Geolocation RPCs and Views
-- ============================================================================
-- Este arquivo contém testes SQL para validar as funções RPC e views
-- criadas pela migration 20251001_geo_ingest.sql
--
-- Uso:
--   psql "$DATABASE_URL" -f supabase/tests/validate_rpc.sql
-- ============================================================================

\echo '=================================================='
\echo 'Iniciando Validação de Geolocalização'
\echo '=================================================='
\echo ''

-- ============================================================================
-- 1. VERIFICAR ESTRUTURA DO BANCO
-- ============================================================================

\echo '1. Verificando tabelas criadas...'
SELECT 
  'scouters' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'scouters'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END as status
UNION ALL
SELECT 
  'scouter_locations',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'scouter_locations'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END
UNION ALL
SELECT 
  'geocache',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'geocache'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END;

\echo ''
\echo '2. Verificando views criadas...'
SELECT 
  'scouter_last_location' as view_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'scouter_last_location'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END as status
UNION ALL
SELECT 
  'scouters_last_locations',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'scouters_last_locations'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END;

\echo ''
\echo '3. Verificando materialized view...'
SELECT 
  'fichas_geo' as matview_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'fichas_geo'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END as status;

\echo ''
\echo '4. Verificando funções RPC...'
SELECT 
  'get_scouters_last_locations()' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'get_scouters_last_locations'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END as status
UNION ALL
SELECT 
  'get_fichas_geo()',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'get_fichas_geo'
  ) THEN '✓ EXISTE' ELSE '✗ FALTANDO' END;

-- ============================================================================
-- 2. TESTAR FUNÇÕES RPC
-- ============================================================================

\echo ''
\echo '=================================================='
\echo 'Testando RPCs'
\echo '=================================================='
\echo ''

-- Teste 1: get_scouters_last_locations
\echo '5. Testando get_scouters_last_locations()...'
DO $$
DECLARE
  result_count INTEGER;
  columns_ok BOOLEAN;
BEGIN
  -- Testar se a função executa sem erro
  BEGIN
    SELECT COUNT(*) INTO result_count 
    FROM public.get_scouters_last_locations();
    
    RAISE NOTICE '✓ Função executou sem erro';
    RAISE NOTICE '  Retornou % registros', result_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERRO ao executar função: %', SQLERRM;
    RETURN;
  END;

  -- Verificar se retorna as colunas corretas
  BEGIN
    PERFORM 
      scouter, 
      tier, 
      latitude, 
      longitude, 
      last_seen,
      status
    FROM public.get_scouters_last_locations() 
    LIMIT 1;
    
    RAISE NOTICE '✓ Colunas de retorno estão corretas';
    RAISE NOTICE '  Colunas: scouter, tier, latitude, longitude, last_seen, status';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERRO nas colunas: %', SQLERRM;
  END;
END $$;

\echo ''
\echo '6. Exemplo de retorno de get_scouters_last_locations():';
SELECT 
  scouter,
  tier,
  round(latitude::numeric, 4) as latitude,
  round(longitude::numeric, 4) as longitude,
  last_seen,
  status
FROM public.get_scouters_last_locations() 
LIMIT 3;

-- Teste 2: get_fichas_geo
\echo ''
\echo '7. Testando get_fichas_geo()...'
DO $$
DECLARE
  result_count INTEGER;
  start_date DATE := CURRENT_DATE - INTERVAL '30 days';
  end_date DATE := CURRENT_DATE;
BEGIN
  -- Testar se a função executa sem erro
  BEGIN
    SELECT COUNT(*) INTO result_count 
    FROM public.get_fichas_geo(start_date, end_date, NULL, NULL);
    
    RAISE NOTICE '✓ Função executou sem erro';
    RAISE NOTICE '  Retornou % registros (últimos 30 dias)', result_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERRO ao executar função: %', SQLERRM;
    RETURN;
  END;

  -- Verificar se retorna as colunas corretas
  BEGIN
    PERFORM 
      id, 
      latitude, 
      longitude, 
      criado, 
      projeto, 
      scouter
    FROM public.get_fichas_geo(start_date, end_date, NULL, NULL) 
    LIMIT 1;
    
    RAISE NOTICE '✓ Colunas de retorno estão corretas';
    RAISE NOTICE '  Colunas: id, latitude, longitude, criado, projeto, scouter';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ ERRO nas colunas: %', SQLERRM;
  END;
END $$;

\echo ''
\echo '8. Exemplo de retorno de get_fichas_geo():';
SELECT 
  substring(id::text, 1, 8) || '...' as id,
  round(latitude::numeric, 4) as latitude,
  round(longitude::numeric, 4) as longitude,
  criado::date as criado,
  projeto,
  scouter
FROM public.get_fichas_geo(
  (CURRENT_DATE - INTERVAL '30 days')::date,
  CURRENT_DATE,
  NULL,
  NULL
) 
LIMIT 3;

-- Teste 3: get_fichas_geo com filtros
\echo ''
\echo '9. Testando get_fichas_geo() com filtros...';
DO $$
DECLARE
  result_count INTEGER;
  start_date DATE := CURRENT_DATE - INTERVAL '7 days';
  end_date DATE := CURRENT_DATE;
  test_project TEXT;
  test_scouter TEXT;
BEGIN
  -- Buscar um projeto e scouter existente para teste
  SELECT DISTINCT projeto INTO test_project 
  FROM public.get_fichas_geo(start_date, end_date, NULL, NULL) 
  WHERE projeto IS NOT NULL 
  LIMIT 1;
  
  SELECT DISTINCT scouter INTO test_scouter 
  FROM public.get_fichas_geo(start_date, end_date, NULL, NULL) 
  WHERE scouter IS NOT NULL 
  LIMIT 1;

  IF test_project IS NULL AND test_scouter IS NULL THEN
    RAISE NOTICE '⚠ Sem dados para testar filtros (últimos 7 dias)';
    RETURN;
  END IF;

  -- Testar filtro por projeto
  IF test_project IS NOT NULL THEN
    SELECT COUNT(*) INTO result_count 
    FROM public.get_fichas_geo(start_date, end_date, test_project, NULL);
    RAISE NOTICE '✓ Filtro por projeto: % registros (projeto: %)', result_count, test_project;
  END IF;

  -- Testar filtro por scouter
  IF test_scouter IS NOT NULL THEN
    SELECT COUNT(*) INTO result_count 
    FROM public.get_fichas_geo(start_date, end_date, NULL, test_scouter);
    RAISE NOTICE '✓ Filtro por scouter: % registros (scouter: %)', result_count, test_scouter;
  END IF;

  -- Testar ambos os filtros
  IF test_project IS NOT NULL AND test_scouter IS NOT NULL THEN
    SELECT COUNT(*) INTO result_count 
    FROM public.get_fichas_geo(start_date, end_date, test_project, test_scouter);
    RAISE NOTICE '✓ Filtro por projeto e scouter: % registros', result_count;
  END IF;
END $$;

-- ============================================================================
-- 3. VERIFICAR ÍNDICES
-- ============================================================================

\echo ''
\echo '=================================================='
\echo 'Verificando Índices Geoespaciais'
\echo '=================================================='
\echo ''

\echo '10. Índices em scouter_locations:';
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'scouter_locations'
ORDER BY indexname;

\echo ''
\echo '11. Índices geoespaciais em fichas/leads:';
SELECT 
  tablename,
  indexname,
  CASE 
    WHEN indexdef LIKE '%lat%' OR indexdef LIKE '%lng%' 
      OR indexdef LIKE '%latitude%' OR indexdef LIKE '%longitude%'
    THEN '✓ GEOESPACIAL'
    ELSE 'outro'
  END as tipo
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (tablename = 'fichas' OR tablename = 'leads')
  AND (
    indexname LIKE '%lat%' OR indexname LIKE '%lng%' 
    OR indexname LIKE '%geo%'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. VERIFICAR RLS POLICIES
-- ============================================================================

\echo ''
\echo '=================================================='
\echo 'Verificando Políticas RLS'
\echo '=================================================='
\echo ''

\echo '12. Políticas RLS criadas:';
SELECT 
  tablename,
  policyname,
  cmd as comando,
  roles::text as papeis
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('scouters', 'scouter_locations', 'geocache')
ORDER BY tablename, policyname;

-- ============================================================================
-- 5. TESTES DE PERFORMANCE
-- ============================================================================

\echo ''
\echo '=================================================='
\echo 'Testes de Performance'
\echo '=================================================='
\echo ''

\echo '13. Estatísticas das tabelas:';
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
  n_live_tup as registros_ativos,
  n_dead_tup as registros_mortos
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('scouters', 'scouter_locations', 'geocache', 'fichas', 'leads')
ORDER BY tablename;

\echo ''
\echo '14. Estatísticas da materialized view:';
SELECT 
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as tamanho,
  ispopulated as populada,
  last_refresh
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname = 'fichas_geo';

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

\echo ''
\echo '=================================================='
\echo 'RESUMO DA VALIDAÇÃO'
\echo '=================================================='
\echo ''

DO $$
DECLARE
  tables_ok INTEGER;
  views_ok INTEGER;
  functions_ok INTEGER;
  total_checks INTEGER := 0;
  passed_checks INTEGER := 0;
BEGIN
  -- Contar tabelas
  SELECT COUNT(*) INTO tables_ok
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('scouters', 'scouter_locations', 'geocache');
  
  total_checks := total_checks + 3;
  passed_checks := passed_checks + tables_ok;
  
  -- Contar views
  SELECT COUNT(*) INTO views_ok
  FROM information_schema.views 
  WHERE table_schema = 'public' 
    AND table_name IN ('scouter_last_location', 'scouters_last_locations');
  
  total_checks := total_checks + 2;
  passed_checks := passed_checks + views_ok;
  
  -- Contar funções
  SELECT COUNT(*) INTO functions_ok
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
    AND routine_name IN ('get_scouters_last_locations', 'get_fichas_geo');
  
  total_checks := total_checks + 2;
  passed_checks := passed_checks + functions_ok;
  
  -- Exibir resultado
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE 'Validação: % de % verificações passaram', passed_checks, total_checks;
  RAISE NOTICE '════════════════════════════════════════════════';
  
  IF passed_checks = total_checks THEN
    RAISE NOTICE '✓ TODAS AS VERIFICAÇÕES PASSARAM!';
    RAISE NOTICE '';
    RAISE NOTICE 'A migration de geolocalização foi aplicada com sucesso.';
    RAISE NOTICE 'As funções RPC estão prontas para uso no frontend.';
  ELSE
    RAISE NOTICE '✗ ALGUMAS VERIFICAÇÕES FALHARAM';
    RAISE NOTICE '';
    RAISE NOTICE 'Verifique os erros acima e reaplique a migration se necessário.';
    RAISE NOTICE 'Comando: psql "$DATABASE_URL" -f supabase/migrations/20251001_geo_ingest.sql';
  END IF;
  
  RAISE NOTICE '';
END $$;

\echo ''
\echo 'Validação concluída!'
\echo ''
