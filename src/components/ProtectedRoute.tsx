import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRoutePermission } from '@/hooks/useRoutePermission';
import { AccessDenied } from '@/components/AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  checkRoutePermission?: boolean;
  requireAdmin?: boolean;
  requireSupervisor?: boolean;
}

export function ProtectedRoute({ 
  children, 
  checkRoutePermission = false,
  requireAdmin = false,
  requireSupervisor = false,
}: ProtectedRouteProps) {
  const { user, loading: authLoading, isAdmin, isSupervisor } = useAuthContext();
  const location = useLocation();
  
  // Only call the hook if route permission checking is enabled
  const shouldCheckRoute = checkRoutePermission && location.pathname;
  const { canAccess, loading: permissionLoading, routeName } = useRoutePermission(
    shouldCheckRoute ? location.pathname : ''
  );

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <AccessDenied message="Esta página requer privilégios de administrador." />;
  }

  // Check supervisor requirement
  if (requireSupervisor && !isSupervisor && !isAdmin) {
    return <AccessDenied message="Esta página requer privilégios de supervisor ou administrador." />;
  }

  // Check route permission if enabled
  if (checkRoutePermission) {
    // Show loading while checking permission
    if (permissionLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // Show access denied if permission check failed
    if (!canAccess) {
      return <AccessDenied routeName={routeName} />;
    }
  }

  return <>{children}</>;
}
