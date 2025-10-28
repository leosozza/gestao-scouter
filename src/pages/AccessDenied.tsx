import { AlertCircle, Home, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { signOut, userProfile } = useAuthContext();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          <CardDescription className="text-base">
            Você não tem permissão para acessar esta página
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>Possíveis motivos:</strong>
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Seu perfil não tem permissões suficientes</li>
              <li>A página é restrita a determinados papéis</li>
              <li>Suas permissões foram alteradas recentemente</li>
            </ul>
          </div>

          {userProfile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Seu perfil:</strong> {userProfile.role_name || 'Não definido'}
              </p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-300">
              <strong>Precisa de acesso?</strong> Entre em contato com seu supervisor ou administrador do sistema.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="default"
            className="w-full sm:flex-1"
            onClick={handleGoHome}
          >
            <Home className="mr-2 h-4 w-4" />
            Voltar ao Início
          </Button>
          <Button
            variant="outline"
            className="w-full sm:flex-1"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Fazer Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
