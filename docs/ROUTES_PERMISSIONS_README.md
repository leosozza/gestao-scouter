# Route Permissions System - README

## Overview

The Route Permissions System provides fine-grained access control for routes in the Gestão Scouter application. It integrates with the existing role-based authentication system to determine whether users can access specific pages based on their assigned roles.

## Architecture

The system consists of three main components:

1. **Database Layer** (`supabase/migrations/20251025_route_permissions.sql`)
   - `route_permissions` table: Stores route configurations and required roles
   - `can_access_route()` RPC function: Performs permission checks on the server

2. **React Hook** (`src/hooks/useRoutePermission.ts`)
   - `useRoutePermission()`: React hook for checking permissions with caching
   - 30-second in-memory cache to minimize RPC calls
   - User-specific cache keys for security

3. **Protected Route Component** (`src/components/ProtectedRoute.tsx`)
   - Wraps routes to enforce authentication and optional permission checks
   - Shows loading states during permission verification
   - Redirects to `/access-denied` when access is denied

## How It Works

### Permission Check Flow

1. User navigates to a protected route
2. `ProtectedRoute` component checks authentication first
3. If `checkRoutePermission={true}` is set, the hook is invoked
4. Hook checks in-memory cache first (30s TTL)
5. If cache miss, calls `can_access_route()` RPC function
6. RPC function:
   - Gets user's role from `user_roles` table
   - Admins always get access
   - Checks if route is registered in `route_permissions`
   - Supports wildcard patterns (e.g., `/scouter/*`)
   - Falls back to `__default__` configuration if route not found
7. Result is cached and returned to the component
8. Component shows content, loading, or redirects to access denied page

### Cache Behavior

- **TTL**: 30 seconds per permission check
- **Scope**: Per-user, per-route
- **Storage**: In-memory (JavaScript Map)
- **Clearing**: Cache is automatically cleared on browser refresh
- **Manual Clear**: Use `clearRoutePermissionCache(routePath?)` function

## Configuration

### Database Configuration

Route permissions are stored in the `route_permissions` table with this structure:

```sql
CREATE TABLE route_permissions (
  id SERIAL PRIMARY KEY,
  route_path TEXT NOT NULL UNIQUE,
  required_roles TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  allow_by_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Default Route Configurations

The system comes pre-configured with permissions for all main routes:

| Route | Required Roles | Description |
|-------|----------------|-------------|
| `__default__` | (none) | Fallback - denies access by default |
| `/dashboard` | admin, supervisor, scouter, gestor_telemarketing | Main dashboard |
| `/dashboard-manager` | admin, supervisor, gestor_telemarketing | Manager dashboard |
| `/leads` | admin, supervisor, scouter, telemarketing, gestor_telemarketing | Leads management |
| `/lead` | admin, supervisor, scouter, telemarketing, gestor_telemarketing | Individual lead page |
| `/scouter/*` | admin, supervisor, scouter | Scouter routes (wildcard) |
| `/scouter/area` | admin, supervisor, scouter | Area de Abordagem |
| `/scouter/analise` | admin, supervisor, scouter | Performance Analysis |
| `/scouters` | admin, supervisor | Scouters management |
| `/pagamentos` | admin, supervisor | Payment management |
| `/admin/*` | admin | Admin panel (wildcard) |
| `/sync-monitor` | admin | Sync monitoring |

### Wildcard Routes

Wildcard routes use the `*` character to match multiple paths:

- `/scouter/*` matches `/scouter/area`, `/scouter/analise`, `/scouter/anything`
- `/admin/*` matches `/admin/users`, `/admin/settings`, etc.

When checking permissions, the system first tries exact matches, then checks wildcard patterns ordered by length (longest first).

### Default Fallback

The special route `__default__` defines the behavior for routes not explicitly registered:

```sql
INSERT INTO route_permissions (route_path, required_roles, allow_by_default)
VALUES ('__default__', '{}', FALSE);
```

- `allow_by_default = FALSE`: Deny access to unregistered routes (secure by default)
- `allow_by_default = TRUE`: Allow access to unregistered routes (open by default)

**Recommendation**: Keep `allow_by_default = FALSE` for security.

## Usage

### Enabling Permission Checks on Routes

In `src/App.tsx`, wrap routes with `ProtectedRoute` and set `checkRoutePermission`:

```tsx
// With permission check
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute checkRoutePermission>
      <Dashboard />
    </ProtectedRoute>
  } 
/>

// Without permission check (only auth required)
<Route 
  path="/configuracoes" 
  element={
    <ProtectedRoute>
      <ConfiguracoesPage />
    </ProtectedRoute>
  } 
/>

// Public route (no ProtectedRoute wrapper)
<Route path="/login" element={<Login />} />
```

### Using the Hook Directly

For advanced scenarios, you can use the hook directly in components:

```tsx
import { useRoutePermission } from '@/hooks/useRoutePermission';

function MyComponent() {
  const { hasAccess, loading, error } = useRoutePermission('/admin/users');

  if (loading) return <div>Checking permissions...</div>;
  if (error) return <div>Error checking permissions</div>;
  if (!hasAccess) return <div>Access denied</div>;

  return <div>Protected content</div>;
}
```

### Clearing Cache

Clear the cache when permissions are updated:

```tsx
import { clearRoutePermissionCache } from '@/hooks/useRoutePermission';

// Clear cache for a specific route
clearRoutePermissionCache('/dashboard');

// Clear entire cache
clearRoutePermissionCache();
```

## Managing Route Permissions

### Adding New Routes

To add permission requirements for a new route:

```sql
INSERT INTO route_permissions (route_path, required_roles, description)
VALUES (
  '/new-feature',
  ARRAY['admin', 'supervisor'],
  'New feature page'
);
```

### Updating Existing Routes

```sql
UPDATE route_permissions
SET required_roles = ARRAY['admin', 'supervisor', 'scouter']
WHERE route_path = '/dashboard';
```

### Removing Route Restrictions

To allow all authenticated users:

```sql
UPDATE route_permissions
SET required_roles = ARRAY['admin', 'supervisor', 'scouter', 'telemarketing', 'gestor_telemarketing']
WHERE route_path = '/some-route';
```

Or delete the entry to fall back to default behavior:

```sql
DELETE FROM route_permissions WHERE route_path = '/some-route';
```

## Disabling Permission Enforcement

### Temporary Disable (Development)

To temporarily disable permission checks during development:

1. **Option A**: Remove `checkRoutePermission` prop from routes in `App.tsx`
2. **Option B**: Set `__default__` to allow by default:

```sql
UPDATE route_permissions
SET allow_by_default = TRUE
WHERE route_path = '__default__';
```

### Permanent Disable (Not Recommended)

To completely disable the system:

1. Remove `checkRoutePermission` props from all routes in `App.tsx`
2. Keep the ProtectedRoute wrapper for authentication

**Warning**: This removes fine-grained access control. Users will still need to be authenticated but won't have route-level restrictions.

## Roles

The system recognizes these roles (from `app_role` enum):

- **admin**: Full access to all routes
- **supervisor**: Management access (dashboards, reports, team management)
- **scouter**: Field worker access (leads, area mapping, personal dashboard)
- **telemarketing**: Telemarketing operator access (leads, tabulação)
- **gestor_telemarketing**: Telemarketing manager access (extended telemarketing features)

## Security Considerations

### Best Practices

1. **Secure by Default**: Keep `__default__` set to deny access
2. **Least Privilege**: Only grant minimum necessary roles to routes
3. **Admin Bypass**: Remember that admins always have access
4. **Cache Invalidation**: Clear cache after permission updates
5. **RPC Security**: The `can_access_route()` function uses `SECURITY DEFINER` and bypasses RLS

### Known Limitations

1. **Client-side Only**: This is UI-level security. Always enforce permissions on the server/API level
2. **Cache Timing**: Users may access routes for up to 30 seconds after permissions are revoked (until cache expires)
3. **Role Changes**: If a user's role changes, they need to re-login or cache needs to be cleared
4. **Wildcard Precedence**: Longest wildcard pattern takes precedence. Be careful with overlapping patterns

## Troubleshooting

### User Can't Access Expected Route

1. Check user's role in database:
   ```sql
   SELECT * FROM user_roles WHERE user_id = '<user-uuid>';
   ```

2. Check route configuration:
   ```sql
   SELECT * FROM route_permissions WHERE route_path = '/your-route';
   ```

3. Test RPC function directly:
   ```sql
   SELECT can_access_route('/your-route');
   ```

4. Clear permission cache:
   ```tsx
   clearRoutePermissionCache();
   ```

### Permission Checks Not Working

1. Verify migration was applied:
   ```sql
   SELECT * FROM route_permissions LIMIT 5;
   ```

2. Check browser console for errors
3. Verify `checkRoutePermission` prop is set on the route
4. Ensure user is authenticated (check `user` object in AuthContext)

### Performance Issues

If you notice slow page loads:

1. Increase cache TTL (default 30s) in `useRoutePermission.ts`
2. Verify RPC function isn't being called excessively (check Network tab)
3. Consider caching user roles in AuthContext

## Testing

### Manual Testing

1. Create test users with different roles
2. Log in as each user
3. Attempt to access various routes
4. Verify access is granted/denied correctly
5. Check that AccessDenied page appears for denied routes

### SQL Testing

Test the RPC function directly:

```sql
-- Test as specific user (set auth context first)
SELECT set_config('request.jwt.claims', '{"sub": "<user-uuid>"}', true);
SELECT can_access_route('/dashboard');
SELECT can_access_route('/admin/users');
```

## Migration

### Applying the Migration

Run the migration file in Supabase:

```bash
# Via Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor
-- Copy and paste contents of supabase/migrations/20251025_route_permissions.sql
```

### Rollback

To remove the route permissions system:

```sql
-- Drop function
DROP FUNCTION IF EXISTS public.can_access_route(TEXT);

-- Drop table
DROP TABLE IF EXISTS public.route_permissions;
```

Then remove the `checkRoutePermission` props from routes in `App.tsx`.

## Examples

### Example 1: Restricting Admin Panel

```tsx
// App.tsx
<Route 
  path="/admin/*" 
  element={
    <ProtectedRoute checkRoutePermission>
      <AdminPanel />
    </ProtectedRoute>
  } 
/>
```

```sql
-- Database
INSERT INTO route_permissions (route_path, required_roles, description)
VALUES ('/admin/*', ARRAY['admin'], 'Admin panel and all admin routes');
```

### Example 2: Multi-Role Dashboard

```tsx
// App.tsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute checkRoutePermission>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

```sql
-- Database
INSERT INTO route_permissions (route_path, required_roles, description)
VALUES (
  '/dashboard',
  ARRAY['admin', 'supervisor', 'scouter', 'gestor_telemarketing'],
  'Main dashboard'
);
```

### Example 3: Checking Permissions in Component

```tsx
import { useRoutePermission } from '@/hooks/useRoutePermission';
import { Button } from '@/components/ui/button';

function NavigationMenu() {
  const { hasAccess: canViewAdmin } = useRoutePermission('/admin/users');
  const { hasAccess: canViewReports } = useRoutePermission('/reports');

  return (
    <nav>
      {canViewAdmin && <Button onClick={() => navigate('/admin')}>Admin</Button>}
      {canViewReports && <Button onClick={() => navigate('/reports')}>Reports</Button>}
    </nav>
  );
}
```

## Support

For issues or questions:
- Check this documentation first
- Review the browser console for errors
- Check Supabase logs for RPC function errors
- Contact the system administrator or development team

---

**Last Updated**: 2025-10-25  
**Version**: 1.0.0
