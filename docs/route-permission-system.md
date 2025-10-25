# Route Permission System - Documentation

## Overview

This implementation adds a route-based permission system to the Gestão Scouter application. It allows controlling access to specific routes based on user roles and permissions stored in the database.

## Components

### 1. Database Schema

**New Tables:**

- `routes`: Stores route definitions with metadata
  - `path`: Unique route path (e.g., '/dashboard', '/configuracoes')
  - `name`: Human-readable route name
  - `description`: Optional description
  - `requires_admin`: Boolean flag for admin-only routes

- `route_permissions`: Maps roles to routes with specific permissions
  - `route_id`: Foreign key to routes table
  - `role_id`: Foreign key to roles table
  - `allowed`: Boolean indicating if role can access the route

**New RPC Function:**

- `can_access_route(_user_id, _route_path)`: Returns whether a user can access a specific route
  - Returns: `{ can_access: boolean, route_name: string | null }`
  - Implements smart defaults:
    - Admins can access everything
    - Routes not in the table are allowed by default (permissive)
    - Routes marked `requires_admin=true` are denied to non-admins
    - Specific role permissions override defaults

### 2. React Hook: `useRoutePermission`

**Location:** `src/hooks/useRoutePermission.tsx`

**Usage:**

```tsx
import { useRoutePermission } from '@/hooks/useRoutePermission';

function MyComponent() {
  const { canAccess, loading, routeName } = useRoutePermission('/configuracoes');

  if (loading) return <div>Loading...</div>;
  if (!canAccess) return <div>Access Denied</div>;
  
  return <div>Configurações Content</div>;
}
```

**Features:**

- **In-memory caching**: Caches permission results for 5 minutes to avoid redundant RPC calls
- **Automatic invalidation**: Use `clearPermissionCache()` after role changes
- **Error handling**: Defaults to denying access on errors

**API:**

```typescript
function useRoutePermission(routePath: string): {
  canAccess: boolean;
  loading: boolean;
  routeName?: string | null;
  error?: Error | null;
}

function clearPermissionCache(): void;
```

### 3. Component: `ProtectedRoute`

**Location:** `src/components/ProtectedRoute.tsx`

**Updated Props:**

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  checkRoutePermission?: boolean;  // NEW: Enable route permission checking
  requireAdmin?: boolean;          // NEW: Require admin role
  requireSupervisor?: boolean;     // NEW: Require supervisor or admin role
}
```

**Usage Examples:**

#### Basic Authentication (existing behavior)
```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

#### Admin-only Route
```tsx
<ProtectedRoute requireAdmin={true}>
  <AdminPanel />
</ProtectedRoute>
```

#### Supervisor or Admin Route
```tsx
<ProtectedRoute requireSupervisor={true}>
  <SupervisorDashboard />
</ProtectedRoute>
```

#### Database-driven Route Permission
```tsx
<ProtectedRoute checkRoutePermission={true}>
  <Configuracoes />
</ProtectedRoute>
```

#### Combined Checks
```tsx
// Requires admin AND checks database permission
<ProtectedRoute requireAdmin={true} checkRoutePermission={true}>
  <AdvancedSettings />
</ProtectedRoute>
```

### 4. Component: `AccessDenied`

**Location:** `src/components/AccessDenied.tsx`

A user-friendly access denied page with navigation options.

**Features:**

- Displays route name if available
- Provides "Go Back" and "Go to Dashboard" buttons
- Customizable message

**Usage:**

```tsx
import { AccessDenied } from '@/components/AccessDenied';

// With route name
<AccessDenied routeName="Configurações" />

// With custom message
<AccessDenied message="Esta funcionalidade está disponível apenas para administradores." />
```

## Testing

### Unit Tests

Test files are located in:
- `src/__tests__/hooks/useRoutePermission.test.tsx`
- `src/__tests__/components/ProtectedRoute.test.tsx`

**Note:** This project currently has no test infrastructure. To run tests:

1. Install dependencies:
```bash
npm install -D vitest @testing-library/react @testing-library/react-hooks @testing-library/jest-dom
```

2. Add vitest config to `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
});
```

3. Create test setup file `src/__tests__/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

4. Add test script to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

5. Run tests:
```bash
npm test
```

### Manual Testing

#### Test 1: Admin Access
1. Login as admin user
2. Navigate to `/configuracoes`
3. Should have access

#### Test 2: Non-admin Blocked
1. Login as non-admin user (scouter)
2. Navigate to route marked `requires_admin=true`
3. Should see "Acesso Negado" page

#### Test 3: Role-based Permission
1. Create a route in database:
```sql
INSERT INTO routes (path, name, requires_admin) 
VALUES ('/relatorios', 'Relatórios', false);
```

2. Deny access for scouter role:
```sql
INSERT INTO route_permissions (route_id, role_id, allowed)
SELECT r.id, ro.id, false
FROM routes r, roles ro
WHERE r.path = '/relatorios' AND ro.name = 'scouter';
```

3. Login as scouter
4. Try accessing `/relatorios` with `checkRoutePermission={true}`
5. Should see "Acesso Negado"

#### Test 4: Cache Validation
1. Access a route with `checkRoutePermission={true}`
2. Check browser network tab - should see RPC call
3. Access same route again within 5 minutes
4. Should NOT see new RPC call (cached)

## Database Setup

### Running the Migration

The migration file is already created at:
```
supabase/migrations/20251025142425_7f2ed4f7-158a-424b-a3dc-416fd51211d2.sql
```

**To apply locally:**
```bash
# If using Supabase CLI
supabase db reset

# Or apply specific migration
supabase db push
```

**To apply to production:**
1. Via Supabase Dashboard: Database → Migrations → Run migration
2. Or use Supabase CLI: `supabase db push --linked`

### Managing Routes and Permissions

#### Add a New Protected Route
```sql
INSERT INTO routes (path, name, description, requires_admin) 
VALUES ('/admin/users', 'Gerenciar Usuários', 'Página de gestão de usuários', true);
```

#### Grant Access to a Specific Role
```sql
INSERT INTO route_permissions (route_id, role_id, allowed)
SELECT 
  r.id, 
  ro.id, 
  true
FROM routes r, roles ro
WHERE r.path = '/leads' 
  AND ro.name = 'supervisor';
```

#### Revoke Access from a Role
```sql
UPDATE route_permissions 
SET allowed = false
WHERE route_id = (SELECT id FROM routes WHERE path = '/leads')
  AND role_id = (SELECT id FROM roles WHERE name = 'scouter');
```

#### Check User's Route Access (SQL)
```sql
SELECT * FROM can_access_route('user-uuid-here', '/configuracoes');
```

## Integration Guide

### Step 1: Wrap Routes

In your router configuration (e.g., `src/App.tsx` or route config):

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/configuracoes" element={
        <ProtectedRoute requireAdmin={true} checkRoutePermission={true}>
          <Configuracoes />
        </ProtectedRoute>
      } />
      
      <Route path="/leads" element={
        <ProtectedRoute checkRoutePermission={true}>
          <Leads />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

### Step 2: Clear Cache on Logout

In your logout handler:

```tsx
import { clearPermissionCache } from '@/hooks/useRoutePermission';

async function handleLogout() {
  clearPermissionCache();
  await signOut();
  navigate('/login');
}
```

### Step 3: Clear Cache on Role Change

After updating a user's role:

```tsx
import { clearPermissionCache } from '@/hooks/useRoutePermission';

async function handleRoleUpdate(userId: string, newRoleId: number) {
  await updateUserRole(userId, newRoleId);
  clearPermissionCache();
  toast.success('Permissões atualizadas');
}
```

## Performance Considerations

- **Caching**: In-memory cache prevents redundant database calls (5-minute TTL)
- **Database Indexes**: Indexes on `routes.path` and `route_permissions(route_id, role_id)`
- **RPC Execution**: SECURITY DEFINER function executes with elevated privileges
- **Default Permissive**: Routes not in database allow access by default (minimal configuration needed)

## Security Notes

1. **Admin Override**: Admin users bypass all route restrictions
2. **Permissive Default**: Unknown routes are allowed (consider making restrictive if needed)
3. **Error Handling**: Errors default to denying access
4. **Cache Invalidation**: Remember to clear cache after role changes
5. **RLS**: Add Row Level Security policies to `routes` and `route_permissions` tables if needed

## Migration from Existing Code

If you have existing route guards, you can gradually migrate:

1. **Keep existing guards**: `requireAdmin`, `requireSupervisor` still work
2. **Add database control**: Enable `checkRoutePermission` on specific routes
3. **Phase out hardcoded guards**: Once all routes are in database, remove prop-based guards

## Troubleshooting

### Issue: Permission check always denies access

**Solution:** Check if:
1. User is authenticated
2. User has valid role in `users` table
3. Route exists in `routes` table (if it should)
4. No conflicting `route_permissions` entry with `allowed=false`

### Issue: Cache not clearing

**Solution:** Call `clearPermissionCache()` explicitly:
```tsx
import { clearPermissionCache } from '@/hooks/useRoutePermission';
clearPermissionCache();
```

### Issue: TypeScript errors

**Solution:** Ensure `src/integrations/supabase/types.ts` includes:
- `routes` table definition
- `route_permissions` table definition
- `can_access_route` function in Functions section

## Future Enhancements

1. **UI for Permission Management**: Admin panel to manage routes and permissions
2. **Permission Inheritance**: Child routes inherit parent permissions
3. **Wildcard Routes**: Support patterns like `/admin/*`
4. **Audit Logging**: Log access attempts and denials
5. **Rate Limiting**: Prevent brute-force route testing
6. **Context-based Permissions**: Consider user's supervisor relationship or project assignment

## Support

For issues or questions, refer to:
- Database migration: `supabase/migrations/20251025142425_7f2ed4f7-158a-424b-a3dc-416fd51211d2.sql`
- Hook implementation: `src/hooks/useRoutePermission.tsx`
- Component: `src/components/ProtectedRoute.tsx`
- Test examples: `src/__tests__/`
