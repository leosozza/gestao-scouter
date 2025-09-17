import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react'

export default function Dashboard() {
  // Mock data - replace with actual data from your repositories
  const [stats] = useState({
    totalFichas: 1247,
    totalScouters: 15,
    taxaConversao: 78.5,
    metaMensal: 85.0
  })

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho da equipe de scouting
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Fichas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFichas.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% em relação ao mês anterior
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scouters Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalScouters}</div>
              <p className="text-xs text-muted-foreground">
                3 novos este mês
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.taxaConversao}%</div>
              <p className="text-xs text-muted-foreground">
                +2.5% vs meta
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta Mensal</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.metaMensal}%</div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">No prazo</Badge>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <div className="font-medium">Ana Silva cadastrou 15 fichas</div>
                  <div className="text-sm text-muted-foreground">Há 2 horas</div>
                </div>
                <Badge variant="outline">Novo</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <div className="font-medium">Carlos Santos atingiu meta semanal</div>
                  <div className="text-sm text-muted-foreground">Há 4 horas</div>
                </div>
                <Badge variant="secondary">Meta</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <div className="font-medium">Maria Oliveira atualizou 8 leads</div>
                  <div className="text-sm text-muted-foreground">Há 6 horas</div>
                </div>
                <Badge variant="outline">Update</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}