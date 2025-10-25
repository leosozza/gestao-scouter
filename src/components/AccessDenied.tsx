import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  routeName?: string | null;
  message?: string;
}

export function AccessDenied({ routeName, message }: AccessDeniedProps) {
  const navigate = useNavigate();

  const defaultMessage = routeName
    ? `Você não tem permissão para acessar ${routeName}.`
    : 'Você não tem permissão para acessar esta página.';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
        <p className="text-gray-600 mb-6">{message || defaultMessage}</p>
        <div className="flex gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
          >
            Ir para Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
