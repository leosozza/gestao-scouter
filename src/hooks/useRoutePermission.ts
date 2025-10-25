import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-helper';
import { useAuthContext } from '@/contexts/AuthContext';

// In-memory cache for route permissions
interface CacheEntry {
  hasAccess: boolean;
  timestamp: number;
}

const CACHE_TTL = 30000; // 30 seconds in milliseconds
const permissionCache = new Map<string, CacheEntry>();

export interface UseRoutePermissionResult {
  hasAccess: boolean | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the current user has permission to access a route.
 * Uses a 30-second in-memory cache to avoid frequent RPC calls.
 * 
 * @param routePath - The route path to check (e.g., '/dashboard', '/admin/users')
 * @param enabled - Whether to actually perform the check (default: true)
 * @returns Object with hasAccess (boolean | null), loading, and error
 */
export function useRoutePermission(
  routePath: string,
  enabled: boolean = true
): UseRoutePermissionResult {
  const { user, loading: authLoading } = useAuthContext();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If not enabled or auth is loading, don't check
    if (!enabled || authLoading) {
      setLoading(authLoading);
      return;
    }

    // If no user, deny access
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const checkRoutePermission = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create cache key with user ID to ensure user-specific caching
        const cacheKey = `${user.id}:${routePath}`;
        
        // Check cache first
        const cached = permissionCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
          // Cache hit - use cached value
          setHasAccess(cached.hasAccess);
          setLoading(false);
          return;
        }

        // Cache miss - call RPC function
        const { data, error: rpcError } = await supabase.rpc('can_access_route', {
          route_path: routePath
        });

        if (rpcError) {
          throw rpcError;
        }

        const accessGranted = data === true;
        
        // Update cache
        permissionCache.set(cacheKey, {
          hasAccess: accessGranted,
          timestamp: now
        });

        setHasAccess(accessGranted);
      } catch (err) {
        console.error('Error checking route permission:', err);
        setError(err as Error);
        // On error, deny access by default for security
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkRoutePermission();
  }, [routePath, enabled, user, authLoading]);

  return { hasAccess, loading, error };
}

/**
 * Clear the permission cache for a specific route or all routes.
 * Useful when permissions are updated.
 * 
 * @param routePath - Optional route path to clear. If not provided, clears all cache.
 */
export function clearRoutePermissionCache(routePath?: string): void {
  if (routePath) {
    // Clear all entries for this route (across all users)
    const keysToDelete: string[] = [];
    permissionCache.forEach((_, key) => {
      if (key.endsWith(`:${routePath}`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => permissionCache.delete(key));
  } else {
    // Clear all cache
    permissionCache.clear();
  }
}

/**
 * Check route permission synchronously if cached, otherwise returns null.
 * Useful for immediate checks without hooks.
 * 
 * @param userId - User ID
 * @param routePath - Route path to check
 * @returns boolean if cached, null otherwise
 */
export function getCachedRoutePermission(
  userId: string,
  routePath: string
): boolean | null {
  const cacheKey = `${userId}:${routePath}`;
  const cached = permissionCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.hasAccess;
  }
  
  return null;
}
