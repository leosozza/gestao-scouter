import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { PerformanceDashboard } from '@/components/dashboard/PerformanceDashboard'

export default function Dashboard() {
  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análise de Performance</h1>
            <p className="text-muted-foreground">
              Painel configurável com indicadores personalizados
            </p>
          </div>
        </div>

        <PerformanceDashboard />
      </div>
    </AppShell>
  )
}