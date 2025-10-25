# Routes & Permissions System - README

## Overview

This system provides fine-grained route access control for the Gestão Scouter application. It allows administrators to define which routes (pages) are accessible to different user roles and departments.

## Tables Created

### 1. `app_routes`
Stores all available application routes with metadata.

**Columns:**
- `id` (UUID): Primary key
- `path` (TEXT): Route path (e.g., `/dashboard`, `/leads`)
- `name` (TEXT): Human-readable route name
- `description` (TEXT): Description of route functionality
- `module` (TEXT): Module or section the route belongs to
- `active` (BOOLEAN): Whether the route is currently active
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

### 2. `route_permissions`
Defines which roles and departments can access specific routes.

**Columns:**
- `id` (UUID): Primary key
- `route_id` (UUID): Foreign key to `app_routes`
- `role` (app_role): User role from enum (admin, supervisor, scouter, etc.)
- `department` (TEXT): User department (optional)
- `allowed` (BOOLEAN): Whether access is allowed
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Unique constraint:** `(route_id, role, department)` - prevents duplicate permissions

### 3. `route_access_logs`
Audit trail for route access attempts.

**Columns:**
- `id` (UUID): Primary key
- `user_id` (UUID): User who attempted access
- `route_path` (TEXT): Path accessed
- `access_granted` (BOOLEAN): Whether access was granted
- `user_role` (app_role): User's role at time of access
- `user_department` (TEXT): User's department at time of access
- `accessed_at` (TIMESTAMPTZ): Timestamp of access attempt
- `metadata` (JSONB): Additional metadata (IP, browser, etc.)

## Functions Created

### `can_access_route(_user_id UUID, _route_path TEXT) RETURNS BOOLEAN`

Checks if a user can access a specific route based on their role and department.

**Logic:**
1. Checks if the route exists and is active
2. Gets the user's role from `user_roles` table
3. If user is admin, returns `TRUE` (admins have access to everything)
4. Gets user's department from `profiles` table
5. Checks `route_permissions` for matching rules:
   - Role-only match: `role = user_role AND department IS NULL`
   - Department-only match: `role IS NULL AND department = user_department`
   - Both match: `role = user_role AND department = user_department`
6. Returns `TRUE` if any matching permission with `allowed = TRUE` is found

**Example Usage:**
```sql
-- Check if user can access dashboard
SELECT can_access_route('user-uuid-here', '/dashboard');

-- Check access from application context
SELECT can_access_route(auth.uid(), '/leads');
```

## Installation

### Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project configured locally
- Database connection available

### Apply Migration

#### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd /path/to/gestao-scouter

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push

# Or apply a specific migration
supabase migration up 20251025_create_app_routes_and_route_permissions
```

#### Option 2: Using psql

```bash
# Connect to your database
psql "postgresql://user:password@host:port/database"

# Run the migration file
\i supabase/migrations/20251025_create_app_routes_and_route_permissions.sql
```

#### Option 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20251025_create_app_routes_and_route_permissions.sql`
4. Click "Run"

### Verify Installation

Run the test suite to verify everything was installed correctly:

```bash
# Using psql
psql "postgresql://user:password@host:port/database" -f supabase/tests/validate_route_rpcs.sql

# Using Supabase Dashboard SQL Editor
# Copy and paste contents of supabase/tests/validate_route_rpcs.sql and run
```

Expected output:
```
NOTICE:  ✅ Test 1 PASSED: All required tables exist
NOTICE:  ✅ Test 2 PASSED: Function can_access_route exists
NOTICE:  ✅ Test 3 PASSED: app_routes has 7 routes
...
NOTICE:  All Route Access Control Tests PASSED
```

## Usage Examples

### 1. Add a New Route

```sql
INSERT INTO public.app_routes (path, name, description, module, active)
VALUES (
  '/analytics',
  'Analytics',
  'Advanced analytics and data visualization',
  'reports',
  TRUE
);
```

### 2. Grant Permission to a Role

```sql
-- Allow supervisors to access the analytics route
INSERT INTO public.route_permissions (route_id, role, allowed)
SELECT id, 'supervisor'::app_role, TRUE
FROM public.app_routes
WHERE path = '/analytics';
```

### 3. Grant Permission by Department

```sql
-- Allow all users in 'marketing' department to access analytics
INSERT INTO public.route_permissions (route_id, department, allowed)
SELECT id, 'marketing', TRUE
FROM public.app_routes
WHERE path = '/analytics';
```

### 4. Grant Permission by Role AND Department

```sql
-- Allow only scouters in 'field_ops' department to access a specific route
INSERT INTO public.route_permissions (route_id, role, department, allowed)
SELECT id, 'scouter'::app_role, 'field_ops', TRUE
FROM public.app_routes
WHERE path = '/field-dashboard';
```

### 5. Revoke Permission

```sql
-- Deny access by setting allowed = FALSE
UPDATE public.route_permissions
SET allowed = FALSE
WHERE route_id = (SELECT id FROM public.app_routes WHERE path = '/analytics')
  AND role = 'scouter'::app_role;

-- Or delete the permission entirely
DELETE FROM public.route_permissions
WHERE route_id = (SELECT id FROM public.app_routes WHERE path = '/analytics')
  AND role = 'scouter'::app_role;
```

### 6. Deactivate a Route

```sql
-- Temporarily disable a route (users can't access it even with permissions)
UPDATE public.app_routes
SET active = FALSE
WHERE path = '/maintenance-page';
```

### 7. Check User Access in Application

```sql
-- In your application code, check access like this:
SELECT can_access_route(auth.uid(), '/dashboard') AS can_access;

-- With a specific user ID
SELECT can_access_route('user-uuid-here', '/leads') AS can_access;
```

### 8. Query User's Accessible Routes

```sql
-- Get all routes a user can access
SELECT DISTINCT ar.path, ar.name, ar.description, ar.module
FROM public.app_routes ar
WHERE ar.active = TRUE
  AND can_access_route('user-uuid-here', ar.path) = TRUE
ORDER BY ar.module, ar.name;
```

### 9. Audit Route Access

```sql
-- View recent access attempts
SELECT 
  ral.accessed_at,
  ral.route_path,
  ral.access_granted,
  ral.user_role,
  p.name as user_name
FROM public.route_access_logs ral
LEFT JOIN public.profiles p ON p.id = ral.user_id
ORDER BY ral.accessed_at DESC
LIMIT 50;

-- Find denied access attempts
SELECT 
  ral.accessed_at,
  ral.route_path,
  ral.user_role,
  p.name as user_name
FROM public.route_access_logs ral
LEFT JOIN public.profiles p ON p.id = ral.user_id
WHERE ral.access_granted = FALSE
ORDER BY ral.accessed_at DESC;
```

## Default Routes & Permissions

The migration seeds the following default routes:

| Path | Name | Module | Roles with Access |
|------|------|--------|-------------------|
| `/dashboard` | Dashboard | core | All roles |
| `/leads` | Leads | leads | All roles |
| `/fichas` | Fichas | fichas | scouter, supervisor, admin |
| `/pagamentos` | Pagamentos | financial | supervisor, admin |
| `/configuracoes` | Configurações | settings | admin only |
| `/usuarios` | Usuários | admin | admin only |
| `/relatorios` | Relatórios | reports | supervisor, gestor_telemarketing, admin |

**Note:** Admins always have access to all routes, regardless of permissions.

## Rollback

If you need to rollback this migration, you can drop the created objects:

### Create Rollback SQL

Save this as `rollback_routes_permissions.sql`:

```sql
-- Drop RLS policies first
DROP POLICY IF EXISTS "Authenticated users can view active routes" ON public.app_routes;
DROP POLICY IF EXISTS "Admins have full access to app_routes" ON public.app_routes;
DROP POLICY IF EXISTS "Service role has full access to app_routes" ON public.app_routes;
DROP POLICY IF EXISTS "Authenticated users can view route_permissions" ON public.route_permissions;
DROP POLICY IF EXISTS "Admins have full access to route_permissions" ON public.route_permissions;
DROP POLICY IF EXISTS "Service role has full access to route_permissions" ON public.route_permissions;
DROP POLICY IF EXISTS "Users can view own access logs" ON public.route_access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.route_access_logs;
DROP POLICY IF EXISTS "Admins can manage all access logs" ON public.route_access_logs;
DROP POLICY IF EXISTS "Service role has full access to route_access_logs" ON public.route_access_logs;

-- Drop function
DROP FUNCTION IF EXISTS public.can_access_route(UUID, TEXT);

-- Drop tables (cascade will remove triggers, indexes, constraints)
DROP TABLE IF EXISTS public.route_access_logs CASCADE;
DROP TABLE IF EXISTS public.route_permissions CASCADE;
DROP TABLE IF EXISTS public.app_routes CASCADE;
```

### Apply Rollback

```bash
# Using psql
psql "postgresql://user:password@host:port/database" -f rollback_routes_permissions.sql

# Or using Supabase Dashboard SQL Editor
# Copy and paste the rollback SQL and run
```

## Troubleshooting

### Migration Fails with "type app_role does not exist"

The migration assumes the `app_role` enum exists (created in an earlier migration). If you get this error:

```sql
-- Create the enum first
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing');
```

### Migration Fails with "function update_updated_at_column does not exist"

The trigger function should exist from an earlier migration. If not:

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### can_access_route Always Returns FALSE

Check if:
1. The route exists and is active: `SELECT * FROM app_routes WHERE path = '/your-route';`
2. The user has a role: `SELECT * FROM user_roles WHERE user_id = 'your-user-id';`
3. Permissions exist: `SELECT * FROM route_permissions WHERE route_id = 'route-id';`

### RLS Prevents Access

Remember that RLS is enabled. To bypass RLS during testing:

```sql
-- Temporarily disable RLS (not recommended for production)
ALTER TABLE public.app_routes DISABLE ROW LEVEL SECURITY;

-- Re-enable when done
ALTER TABLE public.app_routes ENABLE ROW LEVEL SECURITY;
```

## Security Considerations

1. **Admin Access:** Admins bypass all route permissions. Ensure admin role is only granted to trusted users.

2. **RLS Policies:** All tables have RLS enabled. Ensure your application uses authenticated connections.

3. **Audit Logs:** The `route_access_logs` table grows over time. Consider implementing a cleanup policy:
   ```sql
   -- Delete logs older than 90 days
   DELETE FROM public.route_access_logs
   WHERE accessed_at < NOW() - INTERVAL '90 days';
   ```

4. **Department Field:** The system uses `profiles.project` as the department field. Adjust the `can_access_route` function if your schema differs.

## Integration with Frontend

Example React/TypeScript code to check route access:

```typescript
import { supabase } from '@/lib/supabase';

async function canAccessRoute(routePath: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('can_access_route', {
      _user_id: (await supabase.auth.getUser()).data.user?.id,
      _route_path: routePath
    });
  
  if (error) {
    console.error('Error checking route access:', error);
    return false;
  }
  
  return data === true;
}

// Usage in route guard
const hasAccess = await canAccessRoute('/dashboard');
if (!hasAccess) {
  // Redirect to unauthorized page
  navigate('/unauthorized');
}
```

## Support

For issues or questions:
1. Check the test suite output for specific errors
2. Review the migration SQL for any dependency issues
3. Consult the Supabase documentation for RLS and RPC functions
4. Contact the development team for assistance

## Change Log

### Version 1.0.0 (2025-10-25)
- Initial implementation
- Created `app_routes`, `route_permissions`, and `route_access_logs` tables
- Implemented `can_access_route` RPC function
- Added comprehensive RLS policies
- Seeded default routes and permissions
- Created test suite
