# Manual Testing Guide - Route Permissions Manager

## Prerequisites
- Admin user account with admin role in the database
- Database migration `20251025_create_route_permissions.sql` has been applied
- Development server is running (`npm run dev`)

## Test Cases

### Test Case 1: Access the Route Permissions Manager
**Steps:**
1. Log in as an admin user
2. Navigate to Configurações (Settings)
3. Click on "Permissões por Página" tab

**Expected Results:**
- Tab should be visible with a Route icon
- Component loads without errors
- Routes are displayed grouped by module
- Permission matrix shows checkboxes for each department/role combination

### Test Case 2: View Routes and Permissions
**Steps:**
1. Access the Route Permissions Manager
2. Observe the displayed routes
3. Check the permission matrix

**Expected Results:**
- Routes are grouped by module (dashboard, leads, fichas, etc.)
- Each route shows: name, description, and path
- Matrix has columns for each department × role combination
- Checkboxes reflect current permissions from database

### Test Case 3: Filter Routes
**Steps:**
1. Type "dashboard" in the search box
2. Select a specific module from the dropdown

**Expected Results:**
- Search filters routes by name, path, or module in real-time
- Module dropdown filters to show only selected module
- Filters can be combined
- Filtered results update immediately

### Test Case 4: Toggle Permissions
**Steps:**
1. Click a checkbox to toggle permission
2. Click another checkbox to toggle a different permission
3. Observe the UI changes

**Expected Results:**
- Checkbox state changes immediately
- Changed checkboxes have yellow border indicator
- Pending changes counter updates
- Warning banner appears showing number of pending changes

### Test Case 5: Save Changes
**Steps:**
1. Toggle several permissions
2. Click "Salvar Alterações" button
3. Wait for save operation to complete

**Expected Results:**
- Button shows "Saving..." state
- Success toast message appears
- Pending changes counter resets to 0
- Permissions are saved to database
- Yellow borders disappear from checkboxes

### Test Case 6: Reload Data
**Steps:**
1. Make some permission changes (don't save)
2. Click "Recarregar" button

**Expected Results:**
- Pending changes are discarded
- Data reloads from database
- UI returns to saved state
- Success toast message appears

### Test Case 7: Export to JSON
**Steps:**
1. Click "Exportar JSON" button

**Expected Results:**
- JSON file downloads automatically
- File name includes current date
- File contains all routes and permissions
- File is valid JSON format

### Test Case 8: Batch Permission Updates
**Steps:**
1. Toggle 10+ permissions
2. Click "Salvar Alterações"

**Expected Results:**
- All changes are saved in a single transaction
- Success message shows number of updated permissions
- If any fail, error message shows count of failures
- UI updates to reflect saved state

### Test Case 9: Non-Admin User Access
**Steps:**
1. Log out admin user
2. Log in as non-admin user
3. Navigate to Configurações

**Expected Results:**
- "Permissões por Página" tab may not be visible or accessible
- If accessed directly, shows permission denied or no data
- RLS policies prevent data access

### Test Case 10: Empty State
**Steps:**
1. Clear all filters
2. If no routes exist, verify empty state

**Expected Results:**
- Shows appropriate message when no routes match filters
- UI remains functional
- Can clear filters to see all routes again

## Integration Tests (Mock-based)

Since there's no testing infrastructure for React components, here's a conceptual test structure:

### Mock Setup
```javascript
// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => Promise.resolve({ data: mockRoutes, error: null })),
    eq: jest.fn(() => ({ 
      order: jest.fn(() => Promise.resolve({ data: mockRoutes, error: null }))
    }))
  })),
  rpc: jest.fn(() => Promise.resolve({ 
    data: { success: true, updated_count: 5, errors: [] }, 
    error: null 
  }))
};
```

### Test Structure
```javascript
describe('RoutePermissionsManager', () => {
  test('renders without crashing', () => {
    // Test component renders
  });

  test('loads routes and permissions on mount', async () => {
    // Test data fetching
  });

  test('filters routes by search term', () => {
    // Test search functionality
  });

  test('toggles permission state', () => {
    // Test checkbox interaction
  });

  test('saves batch permissions', async () => {
    // Test RPC call
  });
});
```

## Database Verification

### Verify Migration
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('app_routes', 'route_permissions');

-- Check routes are seeded
SELECT COUNT(*) FROM app_routes;

-- Check RPC function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'set_route_permissions_batch';
```

### Verify Permissions After Save
```sql
-- Check saved permissions
SELECT r.route_path, rp.department, rp.role, rp.allowed
FROM route_permissions rp
JOIN app_routes r ON r.id = rp.route_id
ORDER BY r.route_path, rp.department, rp.role;
```

### Test RPC Function Directly
```sql
SELECT set_route_permissions_batch('[
  {"route_id": 1, "department": "scouter", "role": "Agent", "allowed": true},
  {"route_id": 2, "department": "scouter", "role": "Supervisor", "allowed": true}
]'::jsonb);
```

## Performance Testing

### Large Dataset
1. Add 50+ routes to app_routes
2. Load the UI
3. Verify performance remains acceptable
4. Test search/filter responsiveness

### Batch Updates
1. Toggle 50+ permissions
2. Save all at once
3. Verify transaction completes successfully
4. Check for timeout issues

## Browser Compatibility

Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

Check for:
- Layout issues
- Checkbox rendering
- Responsive design
- Toast notifications

## Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Use Enter/Space to toggle checkboxes
   - Verify focus indicators

2. **Screen Reader**
   - Use NVDA/JAWS to verify labels
   - Check table headers are announced
   - Verify button purposes are clear

3. **Color Contrast**
   - Verify text is readable
   - Check checkbox states are distinguishable
   - Test in dark mode if available

## Error Scenarios

### Database Connection Error
1. Disconnect from Supabase
2. Try to load component
3. Verify error handling and user message

### Invalid Permissions
1. Manually insert invalid data
2. Try to save
3. Verify error handling

### Network Timeout
1. Simulate slow network
2. Verify loading states
3. Check timeout handling

## Success Criteria

✅ Component builds without errors
✅ Component renders successfully
✅ Routes load from database
✅ Permissions load from database
✅ Search and filter work
✅ Checkboxes toggle correctly
✅ Pending changes are tracked
✅ Save button triggers RPC correctly
✅ Batch update succeeds
✅ Export JSON works
✅ Error states are handled
✅ Success/error toasts display
✅ Admin-only access enforced
✅ Documentation is complete

## Known Limitations

1. No React component unit tests (infrastructure missing)
2. Manual testing required for UI validation
3. No automated E2E tests
4. RLS testing requires database access

## Next Steps

If all tests pass:
1. Deploy to staging environment
2. Conduct UAT with real admin users
3. Monitor for any production issues
4. Gather feedback for improvements
