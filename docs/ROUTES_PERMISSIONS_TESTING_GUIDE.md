# Manual Testing Guide - Route Permissions System

## Prerequisites

Before testing, ensure:
1. ✅ Database migration `20251025_route_permissions.sql` has been applied to Supabase
2. ✅ Application has been built and deployed (`npm run build`)
3. ✅ Test users with different roles exist in the database

## Test User Setup

Create the following test users in Supabase (if not already present):

### User 1: Admin
```sql
-- Insert admin user (if not exists)
INSERT INTO user_roles (user_id, role, project)
VALUES ('[admin-user-uuid]', 'admin', 'scouter');
```

### User 2: Supervisor
```sql
INSERT INTO user_roles (user_id, role, project)
VALUES ('[supervisor-user-uuid]', 'supervisor', 'scouter');
```

### User 3: Scouter
```sql
INSERT INTO user_roles (user_id, role, project)
VALUES ('[scouter-user-uuid]', 'scouter', 'scouter');
```

### User 4: Telemarketing
```sql
INSERT INTO user_roles (user_id, role, project)
VALUES ('[telemarketing-user-uuid]', 'telemarketing', 'telemarketing');
```

## Test Scenarios

### Scenario 1: Admin User Access (Should Pass All)

**Test User**: Admin  
**Expected**: Full access to all routes

| Route | Expected Result | Notes |
|-------|----------------|-------|
| `/login` | ✅ Public access | Login page |
| `/` | ✅ Access granted | Dashboard |
| `/dashboard` | ✅ Access granted | Main dashboard |
| `/leads` | ✅ Access granted | Leads page |
| `/scouters` | ✅ Access granted | Scouters management |
| `/area-de-abordagem` | ✅ Access granted | Area mapping |
| `/scouter/area` | ✅ Access granted | Scouter area |
| `/scouter/analise` | ✅ Access granted | Scouter analysis |
| `/pagamentos` | ✅ Access granted | Payments (no permission check) |
| `/configuracoes` | ✅ Access granted | Settings (no permission check) |

**Steps**:
1. Login as admin user
2. Navigate to each route listed above
3. Verify each page loads successfully
4. Check browser console for no permission errors

**Expected Console Output**:
```
No errors or permission denials
Cache entries created for each route accessed
```

---

### Scenario 2: Supervisor User Access

**Test User**: Supervisor  
**Expected**: Access to most routes except admin-specific

| Route | Expected Result | Notes |
|-------|----------------|-------|
| `/` | ✅ Access granted | Dashboard |
| `/dashboard` | ✅ Access granted | Main dashboard |
| `/leads` | ✅ Access granted | Leads page |
| `/scouters` | ✅ Access granted | Scouters management |
| `/area-de-abordagem` | ✅ Access granted | Area mapping |
| `/scouter/area` | ✅ Access granted | Scouter area |
| `/scouter/analise` | ✅ Access granted | Scouter analysis |
| `/admin/anything` | ❌ Access denied | Should redirect to /access-denied |

**Steps**:
1. Login as supervisor user
2. Navigate to allowed routes - verify access granted
3. Navigate to `/admin/users` or any admin route
4. Verify redirection to `/access-denied`
5. Check AccessDenied page displays correctly

**Expected AccessDenied Page**:
- Shows "Acesso Negado" title
- Displays user's role: "supervisor"
- Shows "Possíveis motivos" section
- Has "Voltar ao Início" button
- Has "Fazer Logout" button

---

### Scenario 3: Scouter User Access

**Test User**: Scouter  
**Expected**: Access to scouter-specific and general routes

| Route | Expected Result | Notes |
|-------|----------------|-------|
| `/` | ✅ Access granted | Dashboard |
| `/dashboard` | ✅ Access granted | Main dashboard |
| `/leads` | ✅ Access granted | Leads page |
| `/area-de-abordagem` | ✅ Access granted | Area mapping |
| `/scouter/area` | ✅ Access granted | Scouter area |
| `/scouter/analise` | ✅ Access granted | Scouter analysis |
| `/scouters` | ❌ Access denied | Management only |
| `/admin/anything` | ❌ Access denied | Admin only |

**Steps**:
1. Login as scouter user
2. Navigate to allowed routes - verify access
3. Try accessing `/scouters` - should be denied
4. Try accessing admin routes - should be denied
5. Verify AccessDenied page for denied routes

---

### Scenario 4: Telemarketing User Access

**Test User**: Telemarketing  
**Expected**: Access to leads only

| Route | Expected Result | Notes |
|-------|----------------|-------|
| `/leads` | ✅ Access granted | Leads page |
| `/dashboard` | ❌ Access denied | Not in allowed roles |
| `/area-de-abordagem` | ❌ Access denied | Scouter-only |
| `/scouters` | ❌ Access denied | Management only |
| `/scouter/area` | ❌ Access denied | Scouter-only |

**Steps**:
1. Login as telemarketing user
2. Try accessing dashboard - should be denied
3. Try accessing scouter routes - should be denied
4. Access `/leads` - should work
5. Verify consistent AccessDenied page for all denials

---

## Performance Testing

### Cache Behavior Test

**Objective**: Verify 30-second cache is working

**Steps**:
1. Open browser DevTools (Network tab)
2. Login as any user
3. Navigate to `/dashboard`
4. Note RPC call to `can_access_route` in Network tab
5. Navigate away (e.g., to `/leads`)
6. Navigate back to `/dashboard` within 30 seconds
7. Check Network tab - should NOT see new RPC call (cache hit)
8. Wait 30+ seconds
9. Navigate to `/dashboard` again
10. Check Network tab - should see new RPC call (cache miss)

**Expected Results**:
- First visit: RPC call visible
- Within 30s: No new RPC call (cache hit)
- After 30s: New RPC call (cache expired)

**DevTools Console Check**:
```javascript
// In browser console, check cache
// (Note: Cache is private, but you can observe behavior through Network tab)
```

---

## Edge Cases Testing

### Edge Case 1: Unregistered Route

**Test**: Navigate to `/some-nonexistent-route`  
**Expected**: 
- Should use `__default__` configuration
- If `allow_by_default = false`, should redirect to AccessDenied
- If `allow_by_default = true`, should allow access (show 404)

**Verify**:
```sql
SELECT allow_by_default FROM route_permissions WHERE route_path = '__default__';
```

### Edge Case 2: User Without Role

**Test**: User with no entry in `user_roles` table  
**Expected**: 
- Should be denied access to all protected routes
- Should redirect to AccessDenied
- RPC function returns `false`

**Setup**:
```sql
-- Temporarily remove user's role
DELETE FROM user_roles WHERE user_id = '[test-user-uuid]';
```

### Edge Case 3: Wildcard Route Matching

**Test**: Access route matching wildcard pattern  
**Routes**: `/scouter/area`, `/scouter/analise` (matched by `/scouter/*`)  
**Expected**: 
- Should match the wildcard pattern
- Should enforce permissions from `/scouter/*` entry

**Verify in DB**:
```sql
-- Should match the wildcard entry
SELECT * FROM route_permissions WHERE '/scouter/area' LIKE REPLACE(route_path, '*', '%');
```

### Edge Case 4: Multiple Roles (if implemented)

**Test**: User with multiple roles  
**Expected**: 
- Should use first role found
- OR should check if ANY role matches (depending on implementation)

---

## UI/UX Verification

### AccessDenied Page Checklist

Visit `/access-denied` and verify:

- [ ] Page loads without errors
- [ ] "Acesso Negado" title is displayed
- [ ] Alert icon (red circle with exclamation) is visible
- [ ] "Possíveis motivos" section lists 3 reasons
- [ ] User's role is displayed (if logged in)
- [ ] "Precisa de acesso?" section with contact info
- [ ] "Voltar ao Início" button exists and works
- [ ] "Fazer Logout" button exists and works
- [ ] Page is responsive (test on mobile viewport)
- [ ] Dark mode works correctly (if enabled)

### Loading States Checklist

- [ ] Initial auth loading shows spinner
- [ ] Permission check loading shows "Verificando permissões..."
- [ ] Loading spinner is centered and visible
- [ ] No layout shift during loading
- [ ] Smooth transition from loading to content

### Error States Checklist

Simulate error by breaking RPC call:

- [ ] Error icon is displayed
- [ ] Error message is clear
- [ ] Technical error details shown (in dev mode)
- [ ] User can navigate away from error state

---

## Database Verification

### Check Route Permissions Table

```sql
-- View all configured routes
SELECT route_path, required_roles, description 
FROM route_permissions 
ORDER BY route_path;

-- Should show at least 12-15 routes including:
-- __default__, /dashboard, /leads, /scouters, /scouter/*, etc.
```

### Check RPC Function

```sql
-- Test RPC directly (must be logged in user)
SELECT can_access_route('/dashboard');  -- Should return boolean
SELECT can_access_route('/admin/users');  -- Should check based on role
```

### Check User Roles

```sql
-- Verify test users have correct roles
SELECT u.email, ur.role, ur.project
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email LIKE '%test%';
```

---

## Regression Testing

Verify that existing functionality still works:

- [ ] Login/logout still works
- [ ] Routes without `checkRoutePermission` still accessible
- [ ] Public routes (login, register) still work
- [ ] Navigation between pages works
- [ ] No console errors on any page
- [ ] Existing authentication checks not broken

---

## Performance Benchmarks

Use browser DevTools Performance tab:

### Metrics to Record:

1. **First Route Load** (with permission check)
   - Time from navigation to content render
   - Expected: < 200ms (including RPC call ~50-100ms)

2. **Cached Route Load** (within 30s)
   - Time from navigation to content render  
   - Expected: < 50ms (cache hit, no RPC)

3. **Memory Usage**
   - Check before and after navigating 20 routes
   - Expected: < 1KB increase (minimal cache footprint)

4. **Network Requests**
   - Count RPC calls in 2 minutes of navigation
   - Expected: ~4-5 calls max (with 30s cache)

---

## Bug Reporting Template

If you find issues, report with this format:

```
**Bug**: [Brief description]

**Steps to Reproduce**:
1. Login as [role]
2. Navigate to [route]
3. [What happened]

**Expected**: [What should happen]
**Actual**: [What actually happened]

**Environment**:
- Browser: [Chrome/Firefox/Safari + version]
- User Role: [admin/supervisor/scouter/telemarketing]
- Route: [exact route path]

**Console Errors**: [Any errors from browser console]

**Screenshots**: [If applicable]

**Additional Context**: [Any other relevant info]
```

---

## Testing Sign-off

After completing all tests, fill out:

**Tester**: ________________  
**Date**: ________________  
**Environment**: [ ] Local [ ] Staging [ ] Production  

**Test Results**:
- [ ] All scenarios passed
- [ ] Performance acceptable
- [ ] No regressions found
- [ ] UI/UX verified
- [ ] Database configured correctly

**Issues Found**: ________________

**Ready for Production**: [ ] Yes [ ] No

---

## Automated Verification

Run the verification script:

```bash
bash scripts/verify-route-permissions.sh
```

Expected output: All checks should pass with ✅

---

## Rollback Procedure

If critical issues are found:

### 1. Disable Permission Checks (Quick Fix)

Edit `src/App.tsx` and remove `checkRoutePermission` props:

```tsx
// Before
<Route path="/dashboard" element={
  <ProtectedRoute checkRoutePermission>
    <Dashboard />
  </ProtectedRoute>
} />

// After (rollback)
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### 2. Rollback Database Migration

```sql
-- Remove the RPC function
DROP FUNCTION IF EXISTS public.can_access_route(TEXT);

-- Remove the table
DROP TABLE IF EXISTS public.route_permissions;
```

### 3. Redeploy Previous Version

```bash
# Revert to previous commit
git revert [commit-hash]

# Rebuild and redeploy
npm run build
```

---

## Support Contacts

- **Technical Issues**: [Dev team contact]
- **Permission Requests**: [Admin contact]
- **Documentation**: See `docs/ROUTES_PERMISSIONS_README.md`

---

**Testing Status**: ⏳ Pending  
**Last Updated**: 2025-10-25  
**Version**: 1.0.0
