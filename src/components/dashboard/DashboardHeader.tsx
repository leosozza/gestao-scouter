
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/lovable-uploads/c7328f04-9e37-4cd5-b5a5-260721fcaa72.png" 
            alt="MaxFama" 
            className="h-12 w-12 object-contain"
          />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Dashboard MaxFama
            </h1>
            <p className="text-sm text-gray-600">
              Sistema de Gestão de Scouters
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={onLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
};
