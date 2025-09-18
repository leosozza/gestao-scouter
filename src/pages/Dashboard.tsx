import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AIAnalysis } from '@/components/shared/AIAnalysis'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { BarChart3, TrendingUp, Users, Target, Activity, FileText, Clock } from 'lucide-react'
import { getLeads } from '@/repositories/leadsRepo'

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, any>>({})

  // Stats calculados dos dados reais
  const [stats, setStats] = useState({
    totalFichas: 0,
    totalScouters: 0,
    taxaConversao: 0,
    metaMensal: 85.0
  })

  const filterOptions = [
    {
      key: 'projeto',
      label: 'Projeto',
      type: 'select' as const,
      options: [
        { value: 'fashion-week', label: 'Fashion Week' },
        { value: 'verao', label: 'Projeto Verão' },
        { value: 'inverno', label: 'Projeto Inverno' }
      ]
    },
    {
      key: 'scouter',
      label: 'Scouter',
      type: 'text' as const,
      placeholder: 'Nome do scouter...'
    },
    {
      key: 'dataInicio',
      label: 'Data Início',
      type: 'date' as const
    },
    {
      key: 'dataFim',
      label: 'Data Fim',
      type: 'date' as const
    }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getLeads()
      setLeads(data)
      
      // Calcular estatísticas
      const totalFichas = data.length
      const scouters = new Set(data.map(d => d.scouter)).size
      const convertidos = data.filter(d => d.etapa === 'Convertido').length
      const taxaConversao = totalFichas > 0 ? (convertidos / totalFichas) * 100 : 0
      
      setStats({
        totalFichas,
        totalScouters: scouters,
        taxaConversao,
        metaMensal: 85.0
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const recentActivity = leads.slice(0, 10).map((lead, index) => ({
    id: index,
    description: `${lead.scouter} ${lead.etapa === 'Convertido' ? 'converteu' : 'cadastrou'} lead: ${lead.nome}`,
    timestamp: lead.data_contato ? new Date(lead.data_contato).toLocaleString('pt-BR') : 'Recente',
    type: lead.etapa === 'Convertido' ? 'success' : 'info'
  }))

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho da equipe de scouting
          </p>
        </div>

        {/* Filtros */}
        <FilterHeader
          filters={filterOptions}
          onFiltersChange={setFilters}
          title="Filtros do Dashboard"
          showSearch={true}
          onSearch={(term) => console.log('Buscar:', term)}
        />

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

        {/* Grid com Atividade e Análise AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <Badge variant="secondary">{recentActivity.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between p-3 rounded-xl border bg-muted/5 hover:bg-muted/10 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-sm leading-relaxed">{activity.description}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {activity.timestamp}
                      </div>
                    </div>
                    <Badge 
                      variant={activity.type === 'success' ? 'default' : 'outline'} 
                      className="ml-2 shrink-0 text-xs"
                    >
                      {activity.type === 'success' ? 'Convertido' : 'Novo'}
                    </Badge>
                  </div>
                ))}
                
                {recentActivity.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <AIAnalysis 
            data={leads}
            title="Insights Inteligentes"
          />
        </div>

        {/* Tabela de Leads Recentes */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Leads Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={leads.slice(0, 10)}
              columns={[
                { key: 'nome', label: 'Nome', sortable: true },
                { key: 'scouter', label: 'Scouter', sortable: true },
                { key: 'projeto', label: 'Projeto', sortable: true },
                { key: 'etapa', label: 'Status', sortable: true },
                { key: 'data_contato', label: 'Data', sortable: true }
              ]}
              onRowClick={(row) => console.log('Lead clicado:', row)}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}