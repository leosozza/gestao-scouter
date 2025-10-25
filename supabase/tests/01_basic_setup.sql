-- Test: Basic Database Setup
-- This test verifies that the database schema is properly initialized

-- Test 1: Check if public schema exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
    RAISE EXCEPTION 'Public schema does not exist';
  END IF;
  RAISE NOTICE 'Test 1 PASSED: Public schema exists';
END $$;

-- Test 2: Check if uuid-ossp extension is available
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
    RAISE EXCEPTION 'uuid-ossp extension is not installed';
  END IF;
  RAISE NOTICE 'Test 2 PASSED: uuid-ossp extension is available';
END $$;

-- Test 3: Verify we can generate UUIDs
DO $$
DECLARE
  test_uuid UUID;
BEGIN
  test_uuid := gen_random_uuid();
  IF test_uuid IS NULL THEN
    RAISE EXCEPTION 'Cannot generate UUID';
  END IF;
  RAISE NOTICE 'Test 3 PASSED: UUID generation works (generated: %)', test_uuid;
END $$;

-- Test 4: Check if we can create and query a temporary table
DO $$
BEGIN
  CREATE TEMP TABLE test_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_data TEXT
  );
  
  INSERT INTO test_table (test_data) VALUES ('test');
  
  IF NOT EXISTS (SELECT 1 FROM test_table WHERE test_data = 'test') THEN
    RAISE EXCEPTION 'Cannot insert or query test data';
  END IF;
  
  DROP TABLE test_table;
  RAISE NOTICE 'Test 4 PASSED: Table creation and querying works';
END $$;

-- Output summary
SELECT '✅ All basic database tests passed' AS result;
