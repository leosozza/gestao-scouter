import { LayoutDashboard, TrendingUp, ClipboardList, Users, Wallet, MapPin, Settings, BarChart3 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSidebar()
  
  const items = [
    { key: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { key: '/dashboard-builder', icon: BarChart3, label: 'Dashboard Builder' },
    { key: '/projecao', icon: TrendingUp, label: 'Projeção' },
    { key: '/leads', icon: ClipboardList, label: 'Leads' },
    { key: '/scouters', icon: Users, label: 'Scouters' },
    { key: '/pagamentos', icon: Wallet, label: 'Pagamentos' },
    { key: '/area-de-abordagem', icon: MapPin, label: 'Área de Abordagem' },
    { key: '/configuracoes', icon: Settings, label: 'Configurações' },
  ]
  
  return (
    <SidebarUI>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                const isActive = location.pathname === item.key
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.key)}
                      isActive={isActive}
                      tooltip={state === 'collapsed' ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarUI>
  )
}