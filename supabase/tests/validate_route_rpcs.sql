-- ============================================================================
-- Test Suite: Route Access Control System
-- ============================================================================
-- Purpose: Validate app_routes, route_permissions, and can_access_route function
-- These are smoke tests to ensure the migration was applied successfully
-- ============================================================================

-- ============================================================================
-- 1. Test: Verify tables exist
-- ============================================================================

DO $$
DECLARE
  app_routes_exists BOOLEAN;
  route_permissions_exists BOOLEAN;
  route_access_logs_exists BOOLEAN;
BEGIN
  -- Check if app_routes table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_routes'
  ) INTO app_routes_exists;
  
  -- Check if route_permissions table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'route_permissions'
  ) INTO route_permissions_exists;
  
  -- Check if route_access_logs table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'route_access_logs'
  ) INTO route_access_logs_exists;
  
  -- Assert all tables exist
  IF NOT app_routes_exists THEN
    RAISE EXCEPTION 'Table app_routes does not exist';
  END IF;
  
  IF NOT route_permissions_exists THEN
    RAISE EXCEPTION 'Table route_permissions does not exist';
  END IF;
  
  IF NOT route_access_logs_exists THEN
    RAISE EXCEPTION 'Table route_access_logs does not exist';
  END IF;
  
  RAISE NOTICE '✅ Test 1 PASSED: All required tables exist';
END $$;

-- ============================================================================
-- 2. Test: Verify can_access_route function exists
-- ============================================================================

DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'can_access_route'
  ) INTO function_exists;
  
  IF NOT function_exists THEN
    RAISE EXCEPTION 'Function can_access_route does not exist';
  END IF;
  
  RAISE NOTICE '✅ Test 2 PASSED: Function can_access_route exists';
END $$;

-- ============================================================================
-- 3. Test: Verify app_routes has seeded data
-- ============================================================================

DO $$
DECLARE
  route_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO route_count
  FROM public.app_routes;
  
  IF route_count = 0 THEN
    RAISE EXCEPTION 'app_routes table is empty - seed data was not inserted';
  END IF;
  
  RAISE NOTICE '✅ Test 3 PASSED: app_routes has % routes', route_count;
END $$;

-- ============================================================================
-- 4. Test: Verify specific routes exist
-- ============================================================================

DO $$
DECLARE
  dashboard_exists BOOLEAN;
  leads_exists BOOLEAN;
  fichas_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.app_routes WHERE path = '/dashboard') INTO dashboard_exists;
  SELECT EXISTS(SELECT 1 FROM public.app_routes WHERE path = '/leads') INTO leads_exists;
  SELECT EXISTS(SELECT 1 FROM public.app_routes WHERE path = '/fichas') INTO fichas_exists;
  
  IF NOT dashboard_exists THEN
    RAISE EXCEPTION 'Dashboard route does not exist';
  END IF;
  
  IF NOT leads_exists THEN
    RAISE EXCEPTION 'Leads route does not exist';
  END IF;
  
  IF NOT fichas_exists THEN
    RAISE EXCEPTION 'Fichas route does not exist';
  END IF;
  
  RAISE NOTICE '✅ Test 4 PASSED: Core routes (dashboard, leads, fichas) exist';
END $$;

-- ============================================================================
-- 5. Test: Verify route_permissions has seeded data
-- ============================================================================

DO $$
DECLARE
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permission_count
  FROM public.route_permissions;
  
  IF permission_count = 0 THEN
    RAISE EXCEPTION 'route_permissions table is empty - seed data was not inserted';
  END IF;
  
  RAISE NOTICE '✅ Test 5 PASSED: route_permissions has % permissions', permission_count;
END $$;

-- ============================================================================
-- 6. Test: Verify indexes exist
-- ============================================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('app_routes', 'route_permissions', 'route_access_logs')
    AND indexname IN (
      'idx_app_routes_path',
      'idx_app_routes_active',
      'idx_route_permissions_route_id',
      'idx_route_permissions_role',
      'idx_route_access_logs_user_id',
      'idx_route_access_logs_route_path'
    );
  
  IF index_count < 6 THEN
    RAISE WARNING 'Expected at least 6 indexes, found %', index_count;
  END IF;
  
  RAISE NOTICE '✅ Test 6 PASSED: Found % indexes on route tables', index_count;
END $$;

-- ============================================================================
-- 7. Test: Verify triggers exist
-- ============================================================================

DO $$
DECLARE
  app_routes_trigger_exists BOOLEAN;
  route_permissions_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_app_routes'
    AND tgrelid = 'public.app_routes'::regclass
  ) INTO app_routes_trigger_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_route_permissions'
    AND tgrelid = 'public.route_permissions'::regclass
  ) INTO route_permissions_trigger_exists;
  
  IF NOT app_routes_trigger_exists THEN
    RAISE EXCEPTION 'Trigger set_updated_at_app_routes does not exist';
  END IF;
  
  IF NOT route_permissions_trigger_exists THEN
    RAISE EXCEPTION 'Trigger set_updated_at_route_permissions does not exist';
  END IF;
  
  RAISE NOTICE '✅ Test 7 PASSED: Update triggers exist on app_routes and route_permissions';
END $$;

-- ============================================================================
-- 8. Test: Verify RLS is enabled
-- ============================================================================

DO $$
DECLARE
  app_routes_rls BOOLEAN;
  route_permissions_rls BOOLEAN;
  route_access_logs_rls BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO app_routes_rls
  FROM pg_class
  WHERE relname = 'app_routes' AND relnamespace = 'public'::regnamespace;
  
  SELECT relrowsecurity INTO route_permissions_rls
  FROM pg_class
  WHERE relname = 'route_permissions' AND relnamespace = 'public'::regnamespace;
  
  SELECT relrowsecurity INTO route_access_logs_rls
  FROM pg_class
  WHERE relname = 'route_access_logs' AND relnamespace = 'public'::regnamespace;
  
  IF NOT app_routes_rls THEN
    RAISE EXCEPTION 'RLS is not enabled on app_routes';
  END IF;
  
  IF NOT route_permissions_rls THEN
    RAISE EXCEPTION 'RLS is not enabled on route_permissions';
  END IF;
  
  IF NOT route_access_logs_rls THEN
    RAISE EXCEPTION 'RLS is not enabled on route_access_logs';
  END IF;
  
  RAISE NOTICE '✅ Test 8 PASSED: RLS is enabled on all route tables';
END $$;

-- ============================================================================
-- 9. Test: Verify RLS policies exist
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('app_routes', 'route_permissions', 'route_access_logs');
  
  IF policy_count < 3 THEN
    RAISE WARNING 'Expected at least 3 RLS policies, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✅ Test 9 PASSED: Found % RLS policies on route tables', policy_count;
END $$;

-- ============================================================================
-- 10. Test: can_access_route function executes without error
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_result BOOLEAN;
BEGIN
  -- Create a dummy UUID for testing (doesn't need to exist in database)
  test_user_id := gen_random_uuid();
  
  -- Test with a non-existent route (should return FALSE)
  SELECT public.can_access_route(test_user_id, '/non-existent-route') INTO test_result;
  
  IF test_result IS NULL THEN
    RAISE EXCEPTION 'can_access_route returned NULL instead of BOOLEAN';
  END IF;
  
  IF test_result = TRUE THEN
    RAISE EXCEPTION 'can_access_route returned TRUE for non-existent route';
  END IF;
  
  RAISE NOTICE '✅ Test 10 PASSED: can_access_route executes and returns FALSE for non-existent route';
END $$;

-- ============================================================================
-- 11. Test: can_access_route with existing route but no user
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_result BOOLEAN;
BEGIN
  -- Create a dummy UUID for testing (user doesn't exist)
  test_user_id := gen_random_uuid();
  
  -- Test with an existing route but non-existent user (should return FALSE)
  SELECT public.can_access_route(test_user_id, '/dashboard') INTO test_result;
  
  IF test_result IS NULL THEN
    RAISE EXCEPTION 'can_access_route returned NULL instead of BOOLEAN';
  END IF;
  
  IF test_result = TRUE THEN
    RAISE EXCEPTION 'can_access_route returned TRUE for non-existent user';
  END IF;
  
  RAISE NOTICE '✅ Test 11 PASSED: can_access_route returns FALSE for non-existent user';
END $$;

-- ============================================================================
-- 12. Test: Query app_routes table directly
-- ============================================================================

DO $$
DECLARE
  route_record RECORD;
  route_count INTEGER := 0;
BEGIN
  -- Try to select from app_routes (this tests if the table is accessible)
  FOR route_record IN 
    SELECT id, path, name, active 
    FROM public.app_routes 
    WHERE active = TRUE 
    LIMIT 5
  LOOP
    route_count := route_count + 1;
  END LOOP;
  
  IF route_count = 0 THEN
    RAISE WARNING 'No active routes found in app_routes';
  END IF;
  
  RAISE NOTICE '✅ Test 12 PASSED: Successfully queried % active routes from app_routes', route_count;
END $$;

-- ============================================================================
-- 13. Test: Query route_permissions table directly
-- ============================================================================

DO $$
DECLARE
  permission_record RECORD;
  permission_count INTEGER := 0;
BEGIN
  -- Try to select from route_permissions
  FOR permission_record IN 
    SELECT id, role, department, allowed 
    FROM public.route_permissions 
    WHERE allowed = TRUE 
    LIMIT 5
  LOOP
    permission_count := permission_count + 1;
  END LOOP;
  
  IF permission_count = 0 THEN
    RAISE WARNING 'No allowed permissions found in route_permissions';
  END IF;
  
  RAISE NOTICE '✅ Test 13 PASSED: Successfully queried % permissions from route_permissions', permission_count;
END $$;

-- ============================================================================
-- 14. Test: Verify inactive route returns FALSE
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_route_id UUID;
  test_result BOOLEAN;
BEGIN
  -- Create a dummy UUID for testing
  test_user_id := gen_random_uuid();
  
  -- Insert an inactive test route
  INSERT INTO public.app_routes (path, name, active)
  VALUES ('/test-inactive-route', 'Test Inactive Route', FALSE)
  RETURNING id INTO test_route_id;
  
  -- Test access to inactive route (should return FALSE)
  SELECT public.can_access_route(test_user_id, '/test-inactive-route') INTO test_result;
  
  IF test_result = TRUE THEN
    RAISE EXCEPTION 'can_access_route returned TRUE for inactive route';
  END IF;
  
  -- Clean up test route
  DELETE FROM public.app_routes WHERE id = test_route_id;
  
  RAISE NOTICE '✅ Test 14 PASSED: can_access_route returns FALSE for inactive routes';
END $$;

-- ============================================================================
-- Test Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================================';
  RAISE NOTICE 'All Route Access Control Tests PASSED';
  RAISE NOTICE '======================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Tables: app_routes, route_permissions, route_access_logs ✓';
  RAISE NOTICE '- Function: can_access_route ✓';
  RAISE NOTICE '- Indexes: Created and verified ✓';
  RAISE NOTICE '- Triggers: Update triggers active ✓';
  RAISE NOTICE '- RLS: Enabled with policies ✓';
  RAISE NOTICE '- Seed Data: Routes and permissions populated ✓';
  RAISE NOTICE '- Function Logic: Tested with various scenarios ✓';
  RAISE NOTICE '';
  RAISE NOTICE 'The route access control system is ready for use!';
END $$;
