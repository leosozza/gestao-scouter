-- ============================================================================
-- validate_route_permissions_advanced.sql
-- Test suite for advanced route permissions with temporal validity and role hierarchy
-- ============================================================================

-- This test suite validates:
-- 1. Temporal permissions (valid_from/valid_until)
-- 2. Role hierarchy inheritance
-- 3. Edge cases and constraint validation

BEGIN;

-- Setup: Create test data
-- ============================================================================

-- Ensure we have the required roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin') THEN
    INSERT INTO public.roles (name, description) VALUES ('admin', 'Test admin role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'supervisor') THEN
    INSERT INTO public.roles (name, description) VALUES ('supervisor', 'Test supervisor role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'scouter') THEN
    INSERT INTO public.roles (name, description) VALUES ('scouter', 'Test scouter role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'telemarketing') THEN
    INSERT INTO public.roles (name, description) VALUES ('telemarketing', 'Test telemarketing role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'gestor_telemarketing') THEN
    INSERT INTO public.roles (name, description) VALUES ('gestor_telemarketing', 'Test gestor role');
  END IF;
END $$;

-- Clean up any existing test data
DELETE FROM public.route_permissions WHERE route_path LIKE '/test_%';

-- Test Case Setup
-- ============================================================================

-- Create test users (using a fixed UUID pattern for tests)
-- We'll use these UUIDs in our tests
-- Note: In a real scenario, these would be actual auth.users entries

-- Insert test route permissions
DO $$
DECLARE
  admin_role_id INTEGER;
  supervisor_role_id INTEGER;
  scouter_role_id INTEGER;
  telemarketing_role_id INTEGER;
  gestor_role_id INTEGER;
BEGIN
  -- Get role IDs
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';
  SELECT id INTO supervisor_role_id FROM public.roles WHERE name = 'supervisor';
  SELECT id INTO scouter_role_id FROM public.roles WHERE name = 'scouter';
  SELECT id INTO telemarketing_role_id FROM public.roles WHERE name = 'telemarketing';
  SELECT id INTO gestor_role_id FROM public.roles WHERE name = 'gestor_telemarketing';

  -- Test Case 1: Permission valid now (no temporal restrictions)
  INSERT INTO public.route_permissions (route_path, role_id, allowed)
  VALUES ('/test_always_valid', scouter_role_id, TRUE);

  -- Test Case 2: Permission valid in the past (expired)
  INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until)
  VALUES ('/test_expired', scouter_role_id, TRUE, 
          NOW() - INTERVAL '10 days', 
          NOW() - INTERVAL '5 days');

  -- Test Case 3: Permission valid in the future (not yet active)
  INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until)
  VALUES ('/test_future', scouter_role_id, TRUE,
          NOW() + INTERVAL '5 days',
          NOW() + INTERVAL '10 days');

  -- Test Case 4: Permission currently valid (within time window)
  INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until)
  VALUES ('/test_current_valid', scouter_role_id, TRUE,
          NOW() - INTERVAL '5 days',
          NOW() + INTERVAL '5 days');

  -- Test Case 5: Permission with only valid_from (valid from past to infinity)
  INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until)
  VALUES ('/test_valid_from_only', scouter_role_id, TRUE,
          NOW() - INTERVAL '5 days',
          NULL);

  -- Test Case 6: Permission with only valid_until (valid until future, started from creation)
  INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until)
  VALUES ('/test_valid_until_only', scouter_role_id, TRUE,
          NULL,
          NOW() + INTERVAL '5 days');

  -- Test Case 7: Role hierarchy - permission granted to lower role, accessible by higher role
  -- Scouter has permission, supervisor should inherit it
  INSERT INTO public.route_permissions (route_path, role_id, allowed)
  VALUES ('/test_hierarchy_scouter', scouter_role_id, TRUE);

  -- Test Case 8: Role hierarchy - permission granted to supervisor
  INSERT INTO public.route_permissions (route_path, role_id, allowed)
  VALUES ('/test_hierarchy_supervisor', supervisor_role_id, TRUE);

  -- Test Case 9: Multiple levels of hierarchy
  INSERT INTO public.route_permissions (route_path, role_id, allowed)
  VALUES ('/test_hierarchy_multi', telemarketing_role_id, TRUE);

  -- Test Case 10: Denied permission (allowed = FALSE)
  INSERT INTO public.route_permissions (route_path, role_id, allowed)
  VALUES ('/test_denied', scouter_role_id, FALSE);

END $$;

-- ============================================================================
-- TEST SUITE
-- ============================================================================

\echo '=== Testing Route Permissions Advanced Features ==='
\echo ''

-- Test 1: Verify role hierarchy function
-- ============================================================================
\echo 'Test 1: Role Hierarchy Function'
\echo '--------------------------------'

-- Admin should inherit all roles
SELECT 
  'Test 1.1: Admin inherits all roles' AS test_name,
  CASE 
    WHEN COUNT(*) = 5 THEN 'PASS'
    ELSE 'FAIL: Expected 5 roles, got ' || COUNT(*)::TEXT
  END AS result
FROM public.get_inherited_roles('admin');

-- Supervisor should inherit supervisor, telemarketing, and scouter
SELECT 
  'Test 1.2: Supervisor inherits correct roles' AS test_name,
  CASE 
    WHEN COUNT(*) = 3 AND 
         'supervisor' IN (SELECT role_name FROM public.get_inherited_roles('supervisor')) AND
         'telemarketing' IN (SELECT role_name FROM public.get_inherited_roles('supervisor')) AND
         'scouter' IN (SELECT role_name FROM public.get_inherited_roles('supervisor'))
    THEN 'PASS'
    ELSE 'FAIL: Supervisor should inherit supervisor, telemarketing, and scouter'
  END AS result
FROM public.get_inherited_roles('supervisor');

-- Scouter should only inherit itself
SELECT 
  'Test 1.3: Scouter inherits only itself' AS test_name,
  CASE 
    WHEN COUNT(*) = 1 AND role_name = 'scouter' THEN 'PASS'
    ELSE 'FAIL: Scouter should only inherit itself'
  END AS result
FROM public.get_inherited_roles('scouter');

\echo ''

-- Test 2: Temporal Validity Tests
-- ============================================================================
\echo 'Test 2: Temporal Validity'
\echo '-------------------------'

-- Test 2.1: Permission with no temporal restrictions should be valid
SELECT 
  'Test 2.1: Always valid permission' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_always_valid' 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 2.2: Expired permission should not be valid
SELECT 
  'Test 2.2: Expired permission' AS test_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_expired' 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 2.3: Future permission should not be valid yet
SELECT 
  'Test 2.3: Future permission not yet valid' AS test_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_future' 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 2.4: Currently valid permission should be accessible
SELECT 
  'Test 2.4: Currently valid permission' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_current_valid' 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 2.5: Permission with only valid_from in the past
SELECT 
  'Test 2.5: Valid from past to infinity' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_valid_from_only' 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 2.6: Permission with only valid_until in the future
SELECT 
  'Test 2.6: Valid until future' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_valid_until_only' 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

\echo ''

-- Test 3: Role Hierarchy Inheritance
-- ============================================================================
\echo 'Test 3: Role Hierarchy Inheritance'
\echo '-----------------------------------'

-- For these tests, we need to check if higher roles can access lower role permissions

-- Test 3.1: Admin should access scouter routes (inheritance)
SELECT 
  'Test 3.1: Admin inherits scouter permission' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
      WHERE rp.route_path = '/test_hierarchy_scouter'
        AND rp.allowed = TRUE
        AND r.name IN (SELECT role_name FROM public.get_inherited_roles('admin'))
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 3.2: Supervisor should access scouter routes (inheritance)
SELECT 
  'Test 3.2: Supervisor inherits scouter permission' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
      WHERE rp.route_path = '/test_hierarchy_scouter'
        AND rp.allowed = TRUE
        AND r.name IN (SELECT role_name FROM public.get_inherited_roles('supervisor'))
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 3.3: Scouter should NOT access supervisor-only routes
SELECT 
  'Test 3.3: Scouter does not inherit supervisor permission' AS test_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.route_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
      WHERE rp.route_path = '/test_hierarchy_supervisor'
        AND rp.allowed = TRUE
        AND r.name IN (SELECT role_name FROM public.get_inherited_roles('scouter'))
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 3.4: Admin should access all hierarchy levels
SELECT 
  'Test 3.4: Admin accesses all hierarchy levels' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.route_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
      WHERE rp.route_path = '/test_hierarchy_multi'
        AND rp.allowed = TRUE
        AND r.name IN (SELECT role_name FROM public.get_inherited_roles('admin'))
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

\echo ''

-- Test 4: Constraint Validation
-- ============================================================================
\echo 'Test 4: Constraint Validation'
\echo '------------------------------'

-- Test 4.1: Verify check_valid_dates constraint exists
SELECT 
  'Test 4.1: Check constraint exists' AS test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'check_valid_dates' 
        AND conrelid = 'public.route_permissions'::regclass
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 4.2: Try to insert invalid dates (should fail)
DO $$
DECLARE
  scouter_role_id INTEGER;
  insert_failed BOOLEAN := FALSE;
BEGIN
  SELECT id INTO scouter_role_id FROM public.roles WHERE name = 'scouter';
  
  BEGIN
    -- This should fail due to check constraint
    INSERT INTO public.route_permissions (route_path, role_id, allowed, valid_from, valid_until)
    VALUES ('/test_invalid_dates', scouter_role_id, TRUE,
            NOW() + INTERVAL '5 days',
            NOW() - INTERVAL '5 days');
  EXCEPTION
    WHEN check_violation THEN
      insert_failed := TRUE;
  END;
  
  IF insert_failed THEN
    RAISE NOTICE 'Test 4.2: Invalid date constraint enforced - PASS';
  ELSE
    RAISE NOTICE 'Test 4.2: Invalid date constraint NOT enforced - FAIL';
  END IF;
END $$;

\echo ''

-- Test 5: list_route_permissions function
-- ============================================================================
\echo 'Test 5: Helper Functions'
\echo '------------------------'

-- Test 5.1: list_route_permissions returns data
SELECT 
  'Test 5.1: list_route_permissions returns data' AS test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result
FROM public.list_route_permissions()
WHERE route_path LIKE '/test_%';

-- Test 5.2: Verify is_currently_valid flag works
SELECT 
  'Test 5.2: is_currently_valid flag accuracy' AS test_name,
  CASE 
    WHEN 
      (SELECT is_currently_valid FROM public.list_route_permissions() WHERE route_path = '/test_always_valid') = TRUE
      AND (SELECT is_currently_valid FROM public.list_route_permissions() WHERE route_path = '/test_expired') = FALSE
      AND (SELECT is_currently_valid FROM public.list_route_permissions() WHERE route_path = '/test_future') = FALSE
      AND (SELECT is_currently_valid FROM public.list_route_permissions() WHERE route_path = '/test_current_valid') = TRUE
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

\echo ''

-- Test 6: Edge Cases
-- ============================================================================
\echo 'Test 6: Edge Cases'
\echo '------------------'

-- Test 6.1: Permission with allowed=FALSE should not grant access
SELECT 
  'Test 6.1: Denied permission (allowed=FALSE)' AS test_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.route_permissions rp
      JOIN public.roles r ON r.id = rp.role_id
      WHERE rp.route_path = '/test_denied'
        AND rp.allowed = TRUE
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- Test 6.2: Non-existent route should return no permissions
SELECT 
  'Test 6.2: Non-existent route' AS test_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM public.route_permissions 
      WHERE route_path = '/test_nonexistent_route_xyz'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

\echo ''
\echo '=== Test Suite Complete ==='
\echo ''

-- Clean up test data
DELETE FROM public.route_permissions WHERE route_path LIKE '/test_%';

ROLLBACK;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This test suite validates:
-- ✓ Role hierarchy function returns correct inherited roles
-- ✓ Temporal validity checks (expired, future, current, partial dates)
-- ✓ Role inheritance (higher roles inherit lower role permissions)
-- ✓ Constraints are properly enforced (valid_from <= valid_until)
-- ✓ Helper functions work correctly
-- ✓ Edge cases (denied permissions, non-existent routes)
--
-- To run these tests:
-- psql -U postgres -d your_database -f validate_route_permissions_advanced.sql
-- ============================================================================
