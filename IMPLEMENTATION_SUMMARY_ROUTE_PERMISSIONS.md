# Advanced Route Permissions - Implementation Summary

## Overview

This implementation adds advanced route permissions to the Gestão Scouter system with two major features:

1. **Temporal Validity**: Time-bound permissions with `valid_from` and `valid_until` timestamps
2. **Role Hierarchy**: Automatic permission inheritance through a 5-level role hierarchy

## What Was Implemented

### 1. Database Migration (`supabase/migrations/20251026_route_permissions_advanced.sql`)

**New Table: `route_permissions`**
```sql
route_permissions
├── id (SERIAL PRIMARY KEY)
├── route_path (TEXT) - e.g., '/dashboard'
├── role_id (INTEGER FK to roles)
├── allowed (BOOLEAN) - true to allow, false to deny
├── valid_from (TIMESTAMPTZ nullable) - permission starts here
├── valid_until (TIMESTAMPTZ nullable) - permission ends here
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

**Key Features:**
- ✅ Constraint ensures `valid_from <= valid_until`
- ✅ Unique constraint on `(route_path, role_id)`
- ✅ Performance indexes on route_path, role_id, and dates
- ✅ RLS policies for security (authenticated read, admin write)

**New Functions:**

1. **`get_inherited_roles(role_name TEXT)`**
   - Returns all roles that the given role inherits from
   - Implements hierarchy: admin > gestor_telemarketing > supervisor > telemarketing > scouter

2. **`can_access_route(user_id UUID, route_path TEXT)`**
   - Main access control function
   - Checks: user's role → inherited roles → temporal validity
   - Returns TRUE if user can access the route

3. **`set_route_permission(...)`** (Admin only)
   - Creates or updates a route permission
   - Validates temporal dates
   - ON CONFLICT handling for updates

4. **`list_route_permissions()`**
   - Lists all permissions with current validity status
   - Includes `is_currently_valid` computed column

### 2. Comprehensive Test Suite (`supabase/tests/validate_route_permissions_advanced.sql`)

**Test Coverage:**

| Test Category | Tests | What It Validates |
|--------------|-------|-------------------|
| Role Hierarchy | 3 | Correct inheritance chains for all roles |
| Temporal Validity | 6 | Expired, future, current, and partial dates |
| Role Inheritance | 4 | Higher roles inherit, lower roles don't |
| Constraints | 2 | Date validation enforced |
| Helper Functions | 2 | Management functions work correctly |
| Edge Cases | 2 | Denied permissions, non-existent routes |

**Total: 19+ individual test cases**

All tests use BEGIN/ROLLBACK for isolation and clean up test data.

### 3. Complete Documentation (`docs/ROUTES_PERMISSIONS_README.md`)

**Sections:**
- Database schema with detailed column descriptions
- Role hierarchy visual diagram and explanation
- Temporal permissions concepts and use cases
- Complete function reference with parameters and return types
- 7 practical usage examples with SQL code
- Best practices for security and performance
- Testing instructions
- Troubleshooting guide
- API integration examples (TypeScript/React)

### 4. Verification Tools

**`VERIFICATION_CHECKLIST.md`**
- Step-by-step manual testing procedures
- Acceptance criteria checklist
- Rollback plan
- Known limitations

**`test_migration_locally.sh`**
- Automated testing script
- Tests migration + idempotency + test suite
- Requires DATABASE_URL environment variable

## Role Hierarchy Explained

```
Level 1: admin (highest privilege)
         ↓ inherits from all below
Level 2: gestor_telemarketing
         ↓ inherits from below
Level 3: supervisor
         ↓ inherits from below
Level 4: telemarketing
         ↓ inherits from below
Level 5: scouter (lowest privilege)
```

**Inheritance Rules:**
- Grant permission to **scouter** → All roles can access
- Grant permission to **supervisor** → Supervisor, gestor_telemarketing, and admin can access
- Grant permission to **admin** → Only admin can access
- **Lower roles NEVER inherit from higher roles**

## Temporal Permissions Explained

A permission is valid when BOTH conditions are true:
1. `valid_from IS NULL OR valid_from <= NOW()`
2. `valid_until IS NULL OR valid_until >= NOW()`

**Examples:**

| valid_from | valid_until | Meaning |
|------------|-------------|---------|
| NULL | NULL | Always valid (default) |
| 2025-01-01 | NULL | Valid from Jan 1, 2025 onwards |
| NULL | 2025-12-31 | Valid until Dec 31, 2025 |
| 2025-01-01 | 2025-12-31 | Valid only during 2025 |
| 2025-06-01 | 2025-05-01 | ❌ INVALID (constraint violation) |

## Usage Examples

### Example 1: Check if Current User Can Access Route

```typescript
const canAccess = await supabase.rpc('can_access_route', {
  user_id: (await supabase.auth.getUser()).data.user?.id,
  route_path: '/dashboard'
});
```

### Example 2: Grant Temporary Access (Admin)

```sql
SELECT public.set_route_permission(
  '/special-feature',
  (SELECT id FROM roles WHERE name = 'scouter'),
  TRUE,
  NOW(),
  NOW() + INTERVAL '30 days'
);
```

### Example 3: View All Active Permissions

```sql
SELECT route_path, role_name, valid_from, valid_until
FROM public.list_route_permissions()
WHERE is_currently_valid = TRUE
ORDER BY route_path;
```

### Example 4: See What Roles a User Inherits

```sql
-- What can a supervisor inherit?
SELECT * FROM public.get_inherited_roles('supervisor');
-- Returns: supervisor, telemarketing, scouter
```

## Migration Deployment

### Prerequisites
- Existing `roles` table with the 5 roles defined
- Existing `users` table with `role_id` column
- PostgreSQL 12+ or Supabase

### Deployment Steps

1. **Backup Database** (always!)

2. **Apply Migration**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/20251026_route_permissions_advanced.sql
   ```

3. **Verify Migration**
   ```bash
   psql $DATABASE_URL -f supabase/tests/validate_route_permissions_advanced.sql
   ```

4. **Test Idempotency**
   ```bash
   psql $DATABASE_URL -f supabase/migrations/20251026_route_permissions_advanced.sql
   # Should succeed without errors
   ```

5. **Seed Permissions** (if needed)
   The migration includes example seed data. Add more as needed:
   ```sql
   SELECT public.set_route_permission(
     '/your-route',
     (SELECT id FROM roles WHERE name = 'your_role'),
     TRUE,
     NULL,
     NULL
   );
   ```

### Rollback

If needed, run:
```sql
DROP TABLE IF EXISTS public.route_permissions CASCADE;
DROP FUNCTION IF EXISTS public.can_access_route(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_inherited_roles(TEXT);
DROP FUNCTION IF EXISTS public.set_route_permission(...);
DROP FUNCTION IF EXISTS public.list_route_permissions();
```

## Integration with Application

### Frontend (React/TypeScript)

```typescript
// Create a hook for route permissions
function useRoutePermission(routePath: string) {
  const [canAccess, setCanAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanAccess(false);
        setLoading(false);
        return;
      }
      
      const { data } = await supabase.rpc('can_access_route', {
        user_id: user.id,
        route_path: routePath
      });
      
      setCanAccess(data === true);
      setLoading(false);
    }
    
    checkAccess();
  }, [routePath]);
  
  return { canAccess, loading };
}

// Usage in a component
function ProtectedRoute({ path, children }) {
  const { canAccess, loading } = useRoutePermission(path);
  
  if (loading) return <LoadingSpinner />;
  if (!canAccess) return <AccessDenied />;
  return children;
}
```

### Backend (Edge Functions)

```typescript
// In a Supabase Edge Function
const { data: canAccess } = await supabase
  .rpc('can_access_route', {
    user_id: req.headers.get('user-id'),
    route_path: req.url.pathname
  });

if (!canAccess) {
  return new Response('Access Denied', { status: 403 });
}
```

## Performance Considerations

1. **Indexes**: All key columns are indexed for fast lookups
2. **Single Query**: `can_access_route` uses one optimized query
3. **Caching**: Consider caching permission checks in the frontend
4. **RLS**: Uses Row Level Security for additional security layer

**Benchmark Estimates** (based on typical Supabase performance):
- `can_access_route()`: ~5-10ms
- `get_inherited_roles()`: ~1-2ms
- `list_route_permissions()`: ~10-20ms (depends on row count)

## Security Model

1. **RLS Enabled**: All data access goes through Row Level Security
2. **Admin-Only Writes**: Only admins can modify route permissions
3. **Authenticated Reads**: Any authenticated user can check permissions
4. **No Direct Access**: Users check via functions, not direct table access
5. **Audit Trail**: `created_at` and `updated_at` track changes

## Testing Strategy

1. **Unit Tests**: Test suite covers individual functions
2. **Integration Tests**: Test role hierarchy across multiple levels
3. **Edge Cases**: Null values, expired permissions, denied access
4. **Constraint Tests**: Invalid date ranges rejected
5. **Idempotency Tests**: Migration can run multiple times

**Run Tests:**
```bash
cd /home/runner/work/gestao-scouter/gestao-scouter
psql $DATABASE_URL -f supabase/tests/validate_route_permissions_advanced.sql
```

## Files Delivered

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/20251026_route_permissions_advanced.sql` | 257 | Main migration |
| `supabase/tests/validate_route_permissions_advanced.sql` | 436 | Test suite |
| `docs/ROUTES_PERMISSIONS_README.md` | 414 | Documentation |
| `VERIFICATION_CHECKLIST.md` | 308 | Testing guide |
| `test_migration_locally.sh` | 78 | Test script |
| **Total** | **1,493** | **5 files** |

## Success Criteria Met

✅ Migration creates route_permissions table with valid_from/valid_until  
✅ Constraint ensures valid_from <= valid_until  
✅ can_access_route function considers temporal validity  
✅ can_access_route function implements role hierarchy  
✅ get_inherited_roles returns correct role chains  
✅ Helper functions for permission management  
✅ Comprehensive test suite with 19+ test cases  
✅ Complete documentation with examples  
✅ Migration is idempotent  
✅ RLS policies for security  

## Next Steps

1. ✅ **Code Review**: Ready for review
2. ⏳ **Deploy to Staging**: Apply migration to staging environment
3. ⏳ **Manual Testing**: Run verification checklist
4. ⏳ **Integration**: Update frontend to use permissions
5. ⏳ **Production Deploy**: After successful staging tests

## Support & Questions

- **Documentation**: See `docs/ROUTES_PERMISSIONS_README.md`
- **Testing**: See `VERIFICATION_CHECKLIST.md`
- **Examples**: All SQL files include inline examples
- **Issues**: Contact development team

---

**Implementation Date**: 2025-10-26  
**Version**: 1.0.0  
**Status**: ✅ Ready for Deployment  
**PR**: copilot/add-advanced-permission-features
