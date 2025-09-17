import { LayoutDashboard, TrendingUp, ClipboardList, Users, Wallet, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const items = [
    { key: '/', icon: <LayoutDashboard className='h-4 w-4'/>, label: 'Dashboard' },
    { key: '/projecao', icon: <TrendingUp className='h-4 w-4'/>, label: 'Projeção' },
    { key: '/leads', icon: <ClipboardList className='h-4 w-4'/>, label: 'Leads' },
    { key: '/scouters', icon: <Users className='h-4 w-4'/>, label: 'Scouters' },
    { key: '/pagamentos', icon: <Wallet className='h-4 w-4'/>, label: 'Pagamentos' },
    { key: '/configuracoes', icon: <Settings className='h-4 w-4'/>, label: 'Configurações' },
  ]
  
  return (
    <div className="p-3 space-y-1">
      <div className="px-2 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Navegação
      </div>
      {items.map(item => {
        const isActive = location.pathname === item.key
        return (
          <Button
            key={item.key}
            variant={isActive ? "secondary" : "ghost"}
            onClick={() => navigate(item.key)}
            className={`flex items-center gap-3 w-full justify-start rounded-xl transition-all ${
              isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Button>
        )
      })}
    </div>
  )
}