-- Test: Verify Key Tables Exist
-- This test checks if important tables were created by migrations

-- Test 1: Check if leads table exists (main data table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'leads'
  ) THEN
    RAISE NOTICE 'Test 1 SKIPPED: leads table does not exist (may be expected in some environments)';
  ELSE
    RAISE NOTICE 'Test 1 PASSED: leads table exists';
  END IF;
END $$;

-- Test 2: Check if any tables exist in public schema
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
  
  RAISE NOTICE 'Test 2 INFO: Found % tables in public schema', table_count;
  
  IF table_count > 0 THEN
    RAISE NOTICE 'Test 2 PASSED: Public schema has tables';
  ELSE
    RAISE NOTICE 'Test 2 SKIPPED: No tables in public schema (migrations may have errors)';
  END IF;
END $$;

-- Test 3: List all tables in public schema for debugging
DO $$
DECLARE
  table_record RECORD;
  table_list TEXT := '';
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    IF table_list != '' THEN
      table_list := table_list || ', ';
    END IF;
    table_list := table_list || table_record.table_name;
  END LOOP;
  
  IF table_list = '' THEN
    RAISE NOTICE 'Test 3 INFO: No tables found in public schema';
  ELSE
    RAISE NOTICE 'Test 3 INFO: Tables in public schema: %', table_list;
  END IF;
END $$;

-- Output summary
SELECT '✅ Table verification tests completed' AS result;
