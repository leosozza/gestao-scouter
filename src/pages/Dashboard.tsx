import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { PerformanceDashboard } from '@/components/dashboard/PerformanceDashboard'

export default function Dashboard() {

  return (
    <AppShell sidebar={<Sidebar />}>
      <PerformanceDashboard />
    </AppShell>
  )
}