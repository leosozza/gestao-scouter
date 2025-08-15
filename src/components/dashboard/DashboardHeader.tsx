
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Upload, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

interface DashboardHeaderProps {
  onLogout: () => void;
}

export const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [currentLogo, setCurrentLogo] = useState("/lovable-uploads/c7328f04-9e37-4cd5-b5a5-260721fcaa72.png");
  const { currentTheme, applyTheme, getThemeName } = useTheme();
  const { toast } = useToast();

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newLogo = e.target?.result as string;
        setCurrentLogo(newLogo);
        localStorage.setItem('maxfama_logo', newLogo);
        toast({
          title: "Logo atualizado",
          description: "O novo logo foi aplicado com sucesso"
        });
        setLogoDialogOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThemeChange = (theme: string) => {
    applyTheme(theme as any);
    toast({
      title: "Tema alterado",
      description: `Tema ${getThemeName(theme as any)} aplicado com sucesso`
    });
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={currentLogo}
              alt="MaxFama" 
              className="h-12 w-12 object-contain cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLogoDialogOpen(true)}
              title="Clique para trocar o logo"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dashboard MaxFama
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Sistema de Gestão de Scouters
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Seletor de Tema */}
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              <Select value={currentTheme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="cyan">Ciano</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="dark-blue">Azul Escuro</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="presentation">Apresentação</SelectItem>
                  <SelectItem value="dark-pro">Dark Pro</SelectItem>
                </SelectContent>
              </Select>
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
        </div>
      </header>

      {/* Dialog para trocar logo */}
      <Dialog open={logoDialogOpen} onOpenChange={setLogoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={currentLogo} 
                alt="Logo atual" 
                className="h-20 w-20 object-contain border rounded"
              />
            </div>
            <div>
              <label htmlFor="logo-upload" className="block text-sm font-medium mb-2">
                Selecionar novo logo
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: PNG, JPG, SVG (máx. 2MB)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
