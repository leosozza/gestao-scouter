import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/dashboard/KPICard'
import { AnalysisPanel } from '@/components/dashboard/AnalysisPanel'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { BarChart3, TrendingUp, Users, Target, Activity, FileText, Clock, DollarSign } from 'lucide-react'
import { getLeads, getLeadsSummary, getLeadsByScouter } from '@/repositories/leadsRepo'
import type { Lead, LeadsFilters } from '@/repositories/types'

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LeadsFilters>({})

  // Stats calculados dos dados reais  
  const [summary, setSummary] = useState({
    totalLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    totalValue: 0
  })
  const [scouterStats, setScouterStats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const filterOptions = [
    {
      key: 'projeto',
      label: 'Projeto',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.projetos).filter(p => p && p.trim() !== '')))
        .map(projeto => ({ value: projeto, label: projeto }))
    },
    {
      key: 'scouter',
      label: 'Scouter',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.scouter).filter(s => s && s.trim() !== '')))
        .map(scouter => ({ value: scouter, label: scouter }))
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
    },
    {
      key: 'etapa',
      label: 'Status',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.etapa).filter(e => e && e.trim() !== '')))
        .map(etapa => ({ value: etapa, label: etapa }))
    }
  ]

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [leadsData, summaryData, scoutersData] = await Promise.all([
        getLeads(filters),
        getLeadsSummary(filters),
        getLeadsByScouter(filters)
      ])
      
      setLeads(leadsData)
      setSummary(summaryData)
      setScouterStats(scoutersData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const recentActivity = leads.slice(0, 10).map((lead, index) => ({
    id: index,
    description: `${lead.scouter} ${lead.etapa === 'Convertido' ? 'converteu' : 'cadastrou'} lead: ${lead.nome}`,
    timestamp: lead.data_criacao_ficha ? new Date(lead.data_criacao_ficha).toLocaleString('pt-BR') : 'Recente',
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
          onFiltersChange={(newFilters) => {
            const leadsFilters: LeadsFilters = {
              scouter: newFilters.scouter,
              projeto: newFilters.projeto,
              etapa: newFilters.etapa,
              dataInicio: newFilters.dataInicio,
              dataFim: newFilters.dataFim
            };
            setFilters(leadsFilters);
          }}
          title="Filtros do Dashboard"
          showSearch={true}
          onSearch={(term) => console.log('Buscar:', term)}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total de Fichas"
            value={summary.totalLeads}
            icon={BarChart3}
            trend={{
              value: "+12% vs mês anterior",
              isPositive: true
            }}
            variant="default"
            isLoading={isLoading}
          />
          
          <KPICard
            title="Scouters Ativos"
            value={scouterStats.length}
            icon={Users}
            subtitle={`${scouterStats.filter(s => s.leads > 0).length} produtivos`}
            variant="default"
            isLoading={isLoading}
          />
          
          <KPICard
            title="Taxa de Conversão"
            value={`${summary.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            trend={{
              value: summary.conversionRate > 15 ? "+2.5% vs meta" : "-1.2% vs meta",
              isPositive: summary.conversionRate > 15
            }}
            variant={summary.conversionRate > 15 ? "success" : "warning"}
            isLoading={isLoading}
          />
          
          <KPICard
            title="Valor Total"
            value={`R$ ${summary.totalValue.toLocaleString('pt-BR')}`}
            icon={DollarSign}
            subtitle="Valor acumulado"
            variant="success"
            isLoading={isLoading}
          />
        </div>

        {/* Análise Inteligente */}
        <AnalysisPanel 
          filters={{
            scouters: filters.scouter ? [filters.scouter] : [],
            projects: filters.projeto ? [filters.projeto] : [],
            dateRange: { 
              start: filters.dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
              end: filters.dataFim || new Date().toISOString().split('T')[0]
            }
          }}
          data={{
            leads,
            summary,
            scouterStats
          }}
        />

        {/* Grid com Atividade Recente e Top Performers */}
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
                    <span>Nenhuma atividade recente</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scouterStats.slice(0, 5).map((scouter, index) => (
                  <div key={scouter.scouter} className="flex items-center justify-between p-3 rounded-xl border bg-muted/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{scouter.scouter}</div>
                        <div className="text-xs text-muted-foreground">
                          {scouter.leads} fichas • {scouter.conversionRate.toFixed(1)}% conversão
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">R$ {scouter.value.toLocaleString('pt-BR')}</div>
                      <div className="text-xs text-muted-foreground">valor total</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                { key: 'projetos', label: 'Projeto', sortable: true },
                { key: 'etapa', label: 'Status', sortable: true },
                { 
                  key: 'data_criacao_ficha', 
                  label: 'Data', 
                  sortable: true,
                  formatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
                }
              ]}
              actions={{
                view: (row) => console.log('Lead clicado:', row)
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}