#!/bin/bash
# ============================================================================
# test_migration_locally.sh
# Script to test route permissions migration on a local PostgreSQL instance
# ============================================================================

# Note: This script requires a PostgreSQL database to run
# It's meant to be run manually when you have access to a test database

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "==========================================="
echo "Route Permissions Migration Test"
echo "==========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL not set${NC}"
    echo "Usage: DATABASE_URL='postgresql://user:pass@host:port/dbname' ./test_migration_locally.sh"
    echo ""
    echo "Alternatively, you can test against a Supabase project:"
    echo "supabase db reset --db-url 'postgresql://...'"
    echo ""
    exit 1
fi

echo -e "${YELLOW}Testing migration...${NC}"
echo ""

# Run the migration
echo "1. Running migration..."
psql "$DATABASE_URL" -f supabase/migrations/20251026_route_permissions_advanced.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration executed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi

echo ""
echo "2. Testing idempotency (running migration again)..."
psql "$DATABASE_URL" -f supabase/migrations/20251026_route_permissions_advanced.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration is idempotent${NC}"
else
    echo -e "${RED}✗ Migration failed on second run (not idempotent)${NC}"
    exit 1
fi

echo ""
echo "3. Running test suite..."
psql "$DATABASE_URL" -f supabase/tests/validate_route_permissions_advanced.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests completed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}==========================================="
echo "All tests passed! ✓"
echo "===========================================${NC}"
echo ""
echo "Migration details:"
echo "- Table: public.route_permissions created with temporal columns"
echo "- Function: can_access_route() with hierarchy support"
echo "- Function: get_inherited_roles() for role inheritance"
echo "- Helper functions: set_route_permission(), list_route_permissions()"
echo "- Constraint: valid_from <= valid_until enforced"
echo "- Indexes: Created for performance"
echo "- RLS Policies: Enabled for security"
echo ""
