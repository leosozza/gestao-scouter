interface SidebarProps {
  isConfigOpen: boolean;
  setIsConfigOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function Sidebar({ isConfigOpen, setIsConfigOpen, onLogout }: SidebarProps) {
  return (
    <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bg-card border-r">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <nav className="flex-1 space-y-1 p-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Menu Principal
          </div>
        </nav>
      </div>
    </div>
  );
}