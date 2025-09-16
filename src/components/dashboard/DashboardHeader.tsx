
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";

interface DashboardHeaderProps {
  onLogout: () => void;
  setIsConfigOpen: (open: boolean) => void;
  isConfigOpen: boolean;
}

export const DashboardHeader = ({ onLogout, setIsConfigOpen }: DashboardHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-6 border-b">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho dos scouters e projetos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Fonte:</span>
          <select 
            className="text-sm border rounded px-2 py-1"
            onChange={(e) => {
              const newSource = e.target.value as 'sheets' | 'bitrix';
              localStorage.setItem('gestao-scouter.datasource', newSource);
              window.location.reload();
            }}
            defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('gestao-scouter.datasource') || 'sheets') : 'sheets'}
          >
            <option value="sheets">Google Sheets</option>
            <option value="bitrix">Bitrix24</option>
          </select>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfigOpen(true)}
        >
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </Button>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
};
