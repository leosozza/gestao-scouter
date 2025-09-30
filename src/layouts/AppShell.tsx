import { ReactNode } from 'react'
import { Layers3, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataSourceSelector } from '@/components/dashboard/integrations/DataSourceSelector'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'

interface AppShellProps {
  sidebar: ReactNode
  children: ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background text-foreground flex w-full">
        {/* Sidebar */}
        {sidebar}
        
        {/* Main Content */}
        <SidebarInset className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="h-16 px-4 md:px-6 border-b flex items-center justify-between sticky top-0 bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:flex items-center gap-2 text-xl font-semibold tracking-tight">
                <Layers3 className="h-5 w-5"/> Gestão Scouter
              </div>
            </div>
            
            <div className="hidden md:block max-w-xl w-full px-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por scouter, projeto…" 
                  className="pl-9 rounded-2xl" 
                  aria-label="Buscar"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select defaultValue="ult-6s">
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue placeholder="Período"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ult-4s">Últimas 4 semanas</SelectItem>
                  <SelectItem value="ult-6s">Últimas 6 semanas</SelectItem>
                  <SelectItem value="mes">Mês atual</SelectItem>
                </SelectContent>
              </Select>
              
              <DataSourceSelector />
              
              <Avatar className="h-8 w-8">
                <AvatarFallback>GS</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 md:p-6 space-y-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t p-4 text-xs text-muted-foreground flex items-center justify-between">
            <div>© {new Date().getFullYear()} MaxFama / YBrasil</div>
            <div>v1.1 — Layout lógico e amigável</div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}