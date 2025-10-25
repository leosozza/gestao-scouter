import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRoutePermission } from '@/hooks/useRoutePermission';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  checkRoutePermission?: boolean;
}

export function ProtectedRoute({ children, checkRoutePermission = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuthContext();
  const location = useLocation();
  
  // Check route permissions if enabled
  const { hasAccess, loading: permissionLoading, error: permissionError } = useRoutePermission(
    location.pathname,
    checkRoutePermission && !!user
  );

  // Show loading spinner while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If route permission check is enabled
  if (checkRoutePermission) {
    // Show loading spinner while checking permissions
    if (permissionLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Verificando permissões...</p>
        </div>
      );
    }

    // Show error state if permission check failed
    if (permissionError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
          <AlertCircle className="h-12 w-12 text-amber-600" />
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center max-w-md">
            Erro ao verificar permissões. Por favor, tente novamente.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {permissionError.message}
          </p>
        </div>
      );
    }

    // Deny access if permission check returned false
    if (hasAccess === false) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <>{children}</>;
}
