
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Upload, Palette, Settings, Edit, Bookmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  onLogout: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  showSavedViews?: boolean;
  onToggleSavedViews?: () => void;
}

export const DashboardHeader = ({ 
  onLogout, 
  isEditMode, 
  onToggleEditMode,
  showSavedViews,
  onToggleSavedViews 
}: DashboardHeaderProps) => {
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [currentLogo, setCurrentLogo] = useState("/lovable-uploads/c7328f04-9e37-4cd5-b5a5-260721fcaa72.png");
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('maxfama_theme') || 'classico-corporativo');
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

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.className = root.className.replace(/theme-\w+/g, '');
    
    // Apply new theme
    root.classList.add(`theme-${theme}`);
    
    setCurrentTheme(theme);
    localStorage.setItem('maxfama_theme', theme);
    
    toast({
      title: "Tema aplicado",
      description: `Tema ${theme.replace('-', ' ')} foi aplicado com sucesso`
    });
  };

  const themes = [
    { value: 'classico-corporativo', label: 'Clássico Corporativo' },
    { value: 'contemporaneo-moderno', label: 'Contemporâneo Moderno' },
    { value: 'minimalista', label: 'Minimalista' },
    { value: 'tecnologico-futurista', label: 'Tecnológico Futurista' },
    { value: 'analitico-data-driven', label: 'Analítico Data-driven' },
    { value: 'criativo-gamificado', label: 'Criativo Gamificado' },
    { value: 'dark-profissional', label: 'Dark Mode Profissional' },
    { value: 'neumorfico', label: 'Neumórfico' },
    { value: 'flat-design', label: 'Flat Design' },
    { value: 'glassmórfico', label: 'Glassmórfico' }
  ];

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
              <Select value={currentTheme} onValueChange={applyTheme}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(theme => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fixed Control Buttons */}
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg p-1">
              {/* Settings button */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>

              {/* Saved Views button */}
              {onToggleSavedViews && (
                <Button 
                  variant={showSavedViews ? "default" : "ghost"} 
                  size="sm"
                  onClick={onToggleSavedViews}
                  className="h-8 w-8 p-0"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>
              )}

              {/* Edit Dashboard button */}
              {onToggleEditMode && (
                <Button 
                  variant={isEditMode ? "default" : "ghost"} 
                  size="sm"
                  onClick={onToggleEditMode}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
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
