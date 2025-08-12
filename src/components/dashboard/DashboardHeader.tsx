import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">Maxfama</h1>
              <p className="text-sm text-muted-foreground">Gestão de Leads por Scouter</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={onLogout}
            className="gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};