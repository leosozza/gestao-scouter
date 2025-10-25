# Route Permissions System - README

## Overview

The Route Permissions System allows administrators to manage page-level access control by configuring which departments and roles can access specific routes in the application.

## Architecture

### Database Tables

#### `app_routes`
Stores all application routes organized by module.

**Columns:**
- `id` (SERIAL): Primary key
- `module` (TEXT): Module name (e.g., 'dashboard', 'leads', 'fichas')
- `route_path` (TEXT): URL path (e.g., '/dashboard', '/leads')
- `route_name` (TEXT): Human-readable route name
- `description` (TEXT): Optional description
- `is_active` (BOOLEAN): Whether the route is active
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

#### `route_permissions`
Stores permissions for each route by department and role.

**Columns:**
- `id` (SERIAL): Primary key
- `route_id` (INTEGER): References `app_routes.id`
- `department` (TEXT): Department name (null = applies to all)
- `role` (TEXT): Role name (null = applies to all roles)
- `allowed` (BOOLEAN): Permission granted or denied
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Unique Constraint:** `(route_id, department, role)`

### Database Functions

#### `set_route_permissions_batch(p_items jsonb)`
Performs batch updates of route permissions in a single transaction.

**Parameters:**
- `p_items`: JSON array of permission objects with fields:
  - `route_id`: Route ID
  - `department`: Department name
  - `role`: Role name
  - `allowed`: Boolean permission value

**Returns:**
```json
{
  "success": true,
  "updated_count": 5,
  "errors": []
}
```

**Example Usage:**
```sql
SELECT set_route_permissions_batch('[
  {"route_id": 1, "department": "scouter", "role": "Agent", "allowed": true},
  {"route_id": 1, "department": "scouter", "role": "Supervisor", "allowed": true},
  {"route_id": 2, "department": "admin", "role": "Admin", "allowed": true}
]'::jsonb);
```

#### `user_has_route_permission(_user_id uuid, _route_path text)`
Checks if a user has permission to access a specific route.

**Parameters:**
- `_user_id`: User UUID
- `_route_path`: Route path to check

**Returns:** Boolean

## Admin UI

### RoutePermissionsManager Component

Located at: `src/components/admin/RoutePermissionsManager.tsx`

**Features:**
- **Permission Matrix View**: Shows routes as rows and department/role combinations as columns
- **Grouped by Module**: Routes are organized by their module for easier navigation
- **Search and Filter**: Filter routes by name, path, or module
- **Batch Operations**: Make multiple changes and save them all at once
- **Pending Changes Indicator**: Visual feedback for unsaved changes
- **Export to JSON**: Download current permissions configuration

**Access Requirements:**
⚠️ **Admin role required** - Only users with the `admin` role can access this component.

### How to Access

1. Navigate to **Configurações** (Settings) page
2. Click on the **Permissões por Página** (Page Permissions) tab
3. The RoutePermissionsManager will load all routes and current permissions

### How to Use

#### Viewing Permissions
- Routes are grouped by module (dashboard, leads, fichas, etc.)
- Each row represents a route
- Each column represents a department + role combination
- Checkboxes indicate whether access is allowed

#### Editing Permissions
1. Click checkboxes to toggle permissions
2. Changed permissions will be highlighted (yellow border)
3. A warning banner shows the number of pending changes
4. Click **"Salvar Alterações"** (Save Changes) to apply all changes at once

#### Filtering
- Use the search box to filter by route name, path, or module
- Use the module dropdown to filter by specific module
- Filters apply in real-time

#### Actions
- **Salvar Alterações** (Save Changes): Applies all pending changes via batch RPC
- **Recarregar** (Reload): Discards pending changes and reloads from database
- **Exportar JSON** (Export JSON): Downloads current configuration as JSON file

## Security

### Row Level Security (RLS)
Both `app_routes` and `route_permissions` tables have RLS enabled with admin-only policies:
- Only admins can view routes
- Only admins can manage routes
- Only admins can view permissions
- Only admins can manage permissions

### Functions Security
All RPC functions use `SECURITY DEFINER` and verify admin role before executing.

### Best Practices
1. **Regular Backups**: Export permissions to JSON regularly
2. **Test Changes**: Test permission changes in a staging environment first
3. **Audit Trail**: All changes include timestamps for audit purposes
4. **Principle of Least Privilege**: Grant minimum necessary permissions

## Default Configuration

### Departments
- `scouter`: Field agents and supervisors
- `telemarketing`: Call center agents and managers
- `admin`: System administrators

### Roles
- `Agent`: Basic user role
- `Supervisor`: Team supervisor
- `Manager`: Department manager
- `Admin`: System administrator

### Default Routes
The system comes pre-configured with common routes:
- `/` - Dashboard Principal
- `/dashboard` - Dashboard
- `/leads` - Leads management
- `/area-de-abordagem` - Field work area
- `/scouters` - Scouter management
- `/pagamentos` - Payments
- `/projecao` - Financial projection
- `/configuracoes` - Settings
- `/sync-monitor` - Sync monitor

## Troubleshooting

### Permissions Not Saving
**Problem:** Batch update fails or returns errors

**Solutions:**
1. Check if user has admin role
2. Verify route_id exists in app_routes table
3. Check database logs for constraint violations
4. Ensure Supabase RLS policies allow admin access

### Routes Not Showing
**Problem:** No routes appear in the list

**Solutions:**
1. Verify app_routes table has data (check `is_active = true`)
2. Check if user has admin role for RLS policies
3. Run the migration to seed default routes
4. Check browser console for API errors

### Changes Not Reflected
**Problem:** Changes save but don't appear in UI

**Solutions:**
1. Click "Recarregar" to refresh from database
2. Check if changes were actually saved (check database directly)
3. Clear browser cache
4. Verify permissions table has the new records

## Migration

To set up the Route Permissions System, run the migration:

```bash
# Migration file location
supabase/migrations/20251025_create_route_permissions.sql
```

The migration will:
1. Create `app_routes` and `route_permissions` tables
2. Enable RLS with admin-only policies
3. Create the `set_route_permissions_batch` RPC function
4. Create the `user_has_route_permission` helper function
5. Seed default routes
6. Seed example permissions

## Future Enhancements

### Potential Improvements
- [ ] Role hierarchy support (inheritance)
- [ ] Time-based permissions (schedule access)
- [ ] IP-based restrictions
- [ ] Permission templates for quick setup
- [ ] Bulk permission import from CSV/JSON
- [ ] Permission change history/audit log
- [ ] Visual permission conflict detection
- [ ] Integration with authentication middleware

## API Integration

### Frontend Route Protection

To protect routes in your frontend application, you can create a hook:

```typescript
import { supabase } from '@/lib/supabase-helper';

export const useRoutePermission = (routePath: string) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('user_has_route_permission', {
        _user_id: user.id,
        _route_path: routePath
      });

      if (!error) {
        setHasPermission(data || false);
      }
      setLoading(false);
    };

    checkPermission();
  }, [routePath]);

  return { hasPermission, loading };
};
```

### Usage Example

```typescript
function ProtectedRoute({ path, children }) {
  const { hasPermission, loading } = useRoutePermission(path);

  if (loading) return <LoadingSpinner />;
  if (!hasPermission) return <AccessDenied />;
  
  return children;
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review the troubleshooting section
3. Check database logs
4. Contact the development team

## License

This module is part of the Gestão Scouter system.
