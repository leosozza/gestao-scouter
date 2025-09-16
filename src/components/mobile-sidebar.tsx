import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MobileSidebarProps {
  isConfigOpen: boolean;
  setIsConfigOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function MobileSidebar({ isConfigOpen, setIsConfigOpen, onLogout }: MobileSidebarProps) {
  return (
    <div className="md:hidden">
      <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <nav className="flex flex-col space-y-1">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Menu Principal
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}