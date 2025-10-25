# Route Permissions System - Advanced Features

This document describes the advanced route permissions system with temporal validity and role hierarchy inheritance.

## Overview

The route permissions system provides fine-grained access control for application routes with two advanced features:

1. **Temporal Validity**: Permissions can be set to be valid only during specific time periods
2. **Role Hierarchy**: Higher-level roles automatically inherit permissions from lower-level roles

## Database Schema

### `route_permissions` Table

```sql
CREATE TABLE public.route_permissions (
  id SERIAL PRIMARY KEY,
  route_path TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES public.roles(id),
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NULL,
  valid_until TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (route_path, role_id)
);
```

**Columns:**
- `route_path`: The application route (e.g., '/dashboard', '/configuracoes')
- `role_id`: Reference to the role that has this permission
- `allowed`: Whether access is allowed (TRUE) or denied (FALSE)
- `valid_from`: Permission becomes valid from this timestamp (NULL = no start restriction)
- `valid_until`: Permission is valid until this timestamp (NULL = no end restriction)

**Constraints:**
- `check_valid_dates`: Ensures `valid_from <= valid_until` when both are not NULL
- Unique constraint on `(route_path, role_id)`

## Role Hierarchy

The system implements a strict role hierarchy where higher-level roles automatically inherit permissions from all lower-level roles:

```
admin (highest privilege)
  ↓
gestor_telemarketing
  ↓
supervisor
  ↓
telemarketing
  ↓
scouter (lowest privilege)
```

### How Hierarchy Works

- **Admin**: Can access all routes that any other role can access
- **Gestor Telemarketing**: Inherits permissions from supervisor, telemarketing, and scouter
- **Supervisor**: Inherits permissions from telemarketing and scouter
- **Telemarketing**: Inherits permissions from scouter
- **Scouter**: Only has explicitly granted permissions (no inheritance)

**Important**: Lower roles do NOT inherit permissions from higher roles. For example, a scouter cannot access supervisor-only routes.

## Temporal Permissions

Temporal permissions allow you to grant access for limited time periods. This is useful for:

- **Temporary access**: Grant access to seasonal workers or contractors
- **Trial periods**: Provide limited-time access to premium features
- **Scheduled maintenance**: Restrict access during specific time windows
- **Phased rollouts**: Gradually enable features for different roles

### Temporal Rules

A permission is considered valid when:
```
(valid_from IS NULL OR valid_from <= NOW()) 
AND 
(valid_until IS NULL OR valid_until >= NOW())
```

## Core Functions

### `can_access_route(user_id UUID, route_path TEXT)`

Checks if a user can access a specific route.

**Parameters:**
- `user_id`: UUID of the user
- `route_path`: The route to check (e.g., '/dashboard')

**Returns:** BOOLEAN

**Logic:**
1. Gets the user's role
2. Checks if any permission exists for that route where:
   - The permission role is the user's role OR an inherited role (hierarchy)
   - The permission is allowed (allowed = TRUE)
   - The permission is currently valid (temporal check)

**Example:**
```sql
SELECT public.can_access_route(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,
  '/dashboard'
);
```

### `get_inherited_roles(target_role_name TEXT)`

Returns all roles that the given role inherits from (including itself).

**Parameters:**
- `target_role_name`: Name of the role (e.g., 'supervisor')

**Returns:** TABLE of role names

**Example:**
```sql
-- Returns: admin, gestor_telemarketing, supervisor
SELECT * FROM public.get_inherited_roles('supervisor');
```

### `set_route_permission(...)`

Creates or updates a route permission with optional temporal validity.

**Parameters:**
- `p_route_path`: The route path
- `p_role_id`: Role ID
- `p_allowed`: Whether to allow or deny access
- `p_valid_from`: (Optional) Start timestamp
- `p_valid_until`: (Optional) End timestamp

**Authorization:** Admin only

**Example:**
```sql
-- Grant temporary access for 30 days
SELECT public.set_route_permission(
  '/special-feature',
  (SELECT id FROM roles WHERE name = 'scouter'),
  TRUE,
  NOW(),
  NOW() + INTERVAL '30 days'
);
```

### `list_route_permissions()`

Lists all route permissions with current validity status.

**Returns:** Table with columns:
- `id`, `route_path`, `role_id`, `role_name`, `allowed`
- `valid_from`, `valid_until`
- `is_currently_valid`: BOOLEAN indicating if permission is currently active
- `created_at`

**Example:**
```sql
SELECT * FROM public.list_route_permissions()
WHERE is_currently_valid = TRUE
ORDER BY route_path;
```

## Usage Examples

### Example 1: Grant Permanent Access

Grant a supervisor permanent access to the reports page:

```sql
SELECT public.set_route_permission(
  '/reports',
  (SELECT id FROM public.roles WHERE name = 'supervisor'),
  TRUE,
  NULL,  -- No start date
  NULL   -- No end date
);
```

### Example 2: Grant Temporary Access

Grant a scouter access to a special feature for 2 weeks:

```sql
SELECT public.set_route_permission(
  '/special-campaign',
  (SELECT id FROM public.roles WHERE name = 'scouter'),
  TRUE,
  NOW(),
  NOW() + INTERVAL '14 days'
);
```

### Example 3: Schedule Future Access

Schedule access to a new feature starting next month:

```sql
SELECT public.set_route_permission(
  '/new-feature',
  (SELECT id FROM public.roles WHERE name = 'telemarketing'),
  TRUE,
  '2025-11-01 00:00:00'::TIMESTAMPTZ,
  NULL  -- No end date
);
```

### Example 4: Check User Access

Check if a specific user can access a route:

```sql
SELECT public.can_access_route(
  auth.uid(),  -- Current user
  '/dashboard'
);
```

### Example 5: List Active Permissions

Get all currently active permissions:

```sql
SELECT 
  route_path,
  role_name,
  valid_from,
  valid_until
FROM public.list_route_permissions()
WHERE is_currently_valid = TRUE
ORDER BY route_path, role_name;
```

### Example 6: Role Hierarchy in Action

If you grant permission to a scouter:

```sql
-- Grant to scouter
SELECT public.set_route_permission(
  '/field-reports',
  (SELECT id FROM public.roles WHERE name = 'scouter'),
  TRUE,
  NULL,
  NULL
);
```

Then **all higher roles automatically get access**:
- Supervisor can access (inherits from scouter)
- Gestor Telemarketing can access (inherits from supervisor → scouter)
- Admin can access (inherits from all roles)

But **lower roles do NOT get access** - telemarketing does not inherit scouter permissions since telemarketing is higher in the hierarchy.

### Example 7: Deny Access

Explicitly deny access (overrides hierarchy):

```sql
SELECT public.set_route_permission(
  '/sensitive-data',
  (SELECT id FROM public.roles WHERE name = 'scouter'),
  FALSE,  -- Denied
  NULL,
  NULL
);
```

## Best Practices

### 1. Use Temporal Permissions Wisely

- **Specify both dates** for fixed-term access
- **Use NULL for end date** for ongoing access starting at a specific time
- **Use NULL for start date** for access that expires at a specific time
- **Monitor expiring permissions** and renew them if needed

### 2. Leverage Role Hierarchy

- **Grant to lowest necessary role**: If all roles should have access, grant to scouter and let hierarchy handle the rest
- **Minimize redundant permissions**: Don't grant the same route to multiple roles in the same hierarchy chain
- **Admin gets everything**: No need to explicitly grant every route to admin

### 3. Performance Considerations

- Route permissions are indexed for fast lookups
- The `can_access_route` function is optimized with a single query
- Use `is_currently_valid` column in `list_route_permissions()` to filter active permissions

### 4. Security Guidelines

- **Only admins can manage permissions**: The `set_route_permission` function enforces this
- **Audit permission changes**: The `updated_at` column tracks modifications
- **Test before production**: Use the test suite to validate permission logic

## Testing

Run the comprehensive test suite:

```bash
psql -U postgres -d your_database -f supabase/tests/validate_route_permissions_advanced.sql
```

The test suite validates:
- ✓ Role hierarchy function
- ✓ Temporal validity (expired, future, current, partial dates)
- ✓ Role inheritance logic
- ✓ Constraint enforcement
- ✓ Helper functions
- ✓ Edge cases

## Migration

The migration `20251026_route_permissions_advanced.sql` is idempotent and can be safely re-run. It:

1. Creates the `route_permissions` table with all columns
2. Adds constraints and indexes
3. Implements role hierarchy function
4. Creates the `can_access_route` function
5. Adds helper functions for management
6. Seeds example permissions

To apply:

```bash
psql -U postgres -d your_database -f supabase/migrations/20251026_route_permissions_advanced.sql
```

## Troubleshooting

### Permission Not Working

1. **Check temporal validity**:
   ```sql
   SELECT * FROM list_route_permissions() 
   WHERE route_path = '/your-route' 
   AND is_currently_valid = FALSE;
   ```

2. **Check role hierarchy**:
   ```sql
   SELECT * FROM get_inherited_roles('your_role');
   ```

3. **Verify user's role**:
   ```sql
   SELECT r.name 
   FROM users u 
   JOIN roles r ON r.id = u.role_id 
   WHERE u.id = auth.uid();
   ```

### Constraint Violation

If you get a constraint error:
```
ERROR: new row violates check constraint "check_valid_dates"
```

This means `valid_from > valid_until`. Ensure your dates are in the correct order.

## Future Enhancements

Possible future improvements:

- **IP-based restrictions**: Limit access based on IP address
- **Time-of-day restrictions**: Only allow access during business hours
- **Conditional permissions**: Grant access based on custom conditions
- **Permission groups**: Bundle multiple routes into permission groups
- **Audit logging**: Track all permission checks and changes

## API Integration

In your application code, check permissions before rendering routes:

```typescript
// Example in TypeScript/React
async function checkRouteAccess(routePath: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('can_access_route', {
      user_id: (await supabase.auth.getUser()).data.user?.id,
      route_path: routePath
    });
  
  return data === true;
}

// Usage
if (await checkRouteAccess('/dashboard')) {
  // Render dashboard
} else {
  // Show access denied
}
```

## Support

For questions or issues:
1. Review this documentation
2. Check the test suite for examples
3. Review the migration file for implementation details
4. Contact the development team

---

**Last Updated**: 2025-10-26  
**Version**: 1.0.0  
**Migration**: `20251026_route_permissions_advanced.sql`
