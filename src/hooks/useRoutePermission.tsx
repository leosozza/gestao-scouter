import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface RoutePermissionResult {
  canAccess: boolean;
  loading: boolean;
  routeName?: string | null;
  error?: Error | null;
}

// In-memory cache to avoid repeated RPC calls
const permissionCache = new Map<string, { canAccess: boolean; routeName: string | null; timestamp: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check if the current user has permission to access a specific route
 * @param routePath - The route path to check (e.g., '/dashboard', '/configuracoes')
 * @returns Object containing canAccess boolean, loading state, and optional route name
 */
export function useRoutePermission(routePath: string): RoutePermissionResult {
  const { user } = useAuthContext();
  const [canAccess, setCanAccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [routeName, setRouteName] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setCanAccess(false);
        setLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = `${user.id}:${routePath}`;
      const cached = permissionCache.get(cacheKey);
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
        setCanAccess(cached.canAccess);
        setRouteName(cached.routeName);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Call the RPC function
        const { data, error: rpcError } = await supabase.rpc('can_access_route', {
          _user_id: user.id,
          _route_path: routePath,
        });

        if (rpcError) {
          throw rpcError;
        }

        // The RPC returns an array with one row
        const result = data && data.length > 0 ? data[0] : null;
        const hasAccess = result?.can_access ?? false;
        const name = result?.route_name ?? null;

        // Update cache
        permissionCache.set(cacheKey, {
          canAccess: hasAccess,
          routeName: name,
          timestamp: now,
        });

        setCanAccess(hasAccess);
        setRouteName(name);
      } catch (err) {
        console.error('Error checking route permission:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        // Default to denying access on error
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [user, routePath]);

  return { canAccess, loading, routeName, error };
}

/**
 * Clear the permission cache (useful after role changes or logout)
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
}
