#!/bin/bash
# Route Permissions System - Quick Verification Script
# This script helps verify the route permissions implementation

echo "=================================="
echo "Route Permissions System Verification"
echo "=================================="
echo ""

# Check if files exist
echo "📁 Checking files..."
files=(
  "supabase/migrations/20251025_route_permissions.sql"
  "src/hooks/useRoutePermission.ts"
  "src/pages/AccessDenied.tsx"
  "src/components/ProtectedRoute.tsx"
  "docs/ROUTES_PERMISSIONS_README.md"
  "docs/ROUTES_PERMISSIONS_VISUAL_SUMMARY.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
  fi
done
echo ""

# Check migration file syntax
echo "🔍 Checking migration SQL syntax..."
if grep -q "CREATE TABLE IF NOT EXISTS public.route_permissions" supabase/migrations/20251025_route_permissions.sql; then
  echo "  ✅ route_permissions table creation found"
else
  echo "  ❌ route_permissions table creation not found"
fi

if grep -q "CREATE OR REPLACE FUNCTION public.can_access_route" supabase/migrations/20251025_route_permissions.sql; then
  echo "  ✅ can_access_route RPC function found"
else
  echo "  ❌ can_access_route RPC function not found"
fi

if grep -q "__default__" supabase/migrations/20251025_route_permissions.sql; then
  echo "  ✅ Default fallback configuration found"
else
  echo "  ❌ Default fallback configuration not found"
fi
echo ""

# Check hook implementation
echo "🪝 Checking useRoutePermission hook..."
if grep -q "CACHE_TTL = 30000" src/hooks/useRoutePermission.ts; then
  echo "  ✅ 30-second cache TTL configured"
else
  echo "  ⚠️  Cache TTL might not be 30 seconds"
fi

if grep -q "clearRoutePermissionCache" src/hooks/useRoutePermission.ts; then
  echo "  ✅ Cache clearing function exists"
else
  echo "  ❌ Cache clearing function not found"
fi

if grep -q "supabase.rpc('can_access_route'" src/hooks/useRoutePermission.ts; then
  echo "  ✅ RPC call to can_access_route found"
else
  echo "  ❌ RPC call not found"
fi
echo ""

# Check ProtectedRoute component
echo "🛡️  Checking ProtectedRoute component..."
if grep -q "checkRoutePermission" src/components/ProtectedRoute.tsx; then
  echo "  ✅ checkRoutePermission prop supported"
else
  echo "  ❌ checkRoutePermission prop not found"
fi

if grep -q "useRoutePermission" src/components/ProtectedRoute.tsx; then
  echo "  ✅ useRoutePermission hook integrated"
else
  echo "  ❌ useRoutePermission hook not integrated"
fi

if grep -q "access-denied" src/components/ProtectedRoute.tsx; then
  echo "  ✅ AccessDenied redirect configured"
else
  echo "  ❌ AccessDenied redirect not found"
fi
echo ""

# Check AccessDenied page
echo "🚫 Checking AccessDenied page..."
if grep -q "Acesso Negado" src/pages/AccessDenied.tsx; then
  echo "  ✅ Portuguese translations present"
else
  echo "  ❌ Portuguese translations missing"
fi

if grep -q "useNavigate" src/pages/AccessDenied.tsx; then
  echo "  ✅ Navigation hooks present"
else
  echo "  ❌ Navigation hooks missing"
fi
echo ""

# Check App.tsx routes
echo "🗺️  Checking App.tsx routes..."
protected_routes=$(grep -c "checkRoutePermission" src/App.tsx || echo "0")
if [ "$protected_routes" -gt 0 ]; then
  echo "  ✅ Found $protected_routes routes with permission checks"
else
  echo "  ❌ No routes with permission checks found"
fi

if grep -q "path=\"/access-denied\"" src/App.tsx; then
  echo "  ✅ AccessDenied route registered"
else
  echo "  ❌ AccessDenied route not registered"
fi
echo ""

# Build check
echo "🏗️  Testing build..."
if npm run build > /tmp/build_output.log 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed (check /tmp/build_output.log)"
fi
echo ""

echo "=================================="
echo "Verification complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Apply database migration to Supabase"
echo "2. Test with different user roles"
echo "3. Verify cache behavior"
echo "4. Check AccessDenied page UX"
echo ""
echo "For detailed documentation, see:"
echo "  - docs/ROUTES_PERMISSIONS_README.md"
echo "  - docs/ROUTES_PERMISSIONS_VISUAL_SUMMARY.md"
