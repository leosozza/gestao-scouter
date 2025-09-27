import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from 'recharts'
import { TrendingUp, Calculator, Target } from 'lucide-react'
import { getProjectionData, getAvailableFilters, type ProjectionData, type ProjectionType } from '@/repositories/projectionsRepo'
import { getAppSettings } from '@/repositories/settingsRepo'
import type { AppSettings } from '@/repositories/types'
import { ProjectionFilters } from '@/components/projection/ProjectionFilters'

export default function ProjecaoPage() {
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [projectionType, setProjectionType] = useState<ProjectionType>('scouter')
  const [selectedFilter, setSelectedFilter] = useState<string | undefined>(undefined)
  const [availableFilters, setAvailableFilters] = useState<{ scouters: string[], projetos: string[] }>({ 
    scouters: [], 
    projetos: [] 
  })

  useEffect(() => {
    loadAvailableFilters()
  }, [])

  useEffect(() => {
    fetchData()
  }, [projectionType, selectedFilter])

  const loadAvailableFilters = async () => {
    const filters = await getAvailableFilters()
    setAvailableFilters(filters)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [projections, appSettings] = await Promise.all([
        getProjectionData(projectionType, selectedFilter),
        getAppSettings()
      ])
      setProjectionData(projections)
      setSettings(appSettings)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectionTypeChange = (type: ProjectionType) => {
    setProjectionType(type)
    setSelectedFilter(undefined) // Reset filter when changing type
  }

  // Calculate summary metrics using settings
  const valorFicha = settings?.valor_base_ficha || 10
  const qualityThreshold = settings?.quality_threshold || 50
  const totalFichas = projectionData.reduce((acc, row) => acc + (row.projecao_provavel || 0), 0)
  const totalValor = totalFichas * valorFicha
  const qualityMed = projectionData.length > 0 ? qualityThreshold + 25 : 0 // Mock quality average

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  
  // Função para cor do tier
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamante': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Ouro': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Prata': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'Bronze': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  // Mock series data for chart
  const series = [
    { semana: 'S-4', fichas: 180 },
    { semana: 'S-3', fichas: 195 },
    { semana: 'S-2', fichas: 210 },
    { semana: 'S-1', fichas: 225 },
    { semana: 'S+1', fichas: Math.round(totalFichas) },
  ]

  if (loading) {
    return (
      <AppShell sidebar={<Sidebar />}>
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando projeções...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projeções de Performance</h1>
          <p className="text-muted-foreground">
            Analise as projeções de fichas e rendimentos para as próximas semanas
          </p>
        </div>

        {/* Filtros */}
        <ProjectionFilters
          projectionType={projectionType}
          selectedFilter={selectedFilter}
          availableScouters={availableFilters.scouters}
          availableProjetos={availableFilters.projetos}
          onProjectionTypeChange={handleProjectionTypeChange}
          onSelectedFilterChange={setSelectedFilter}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichas Previstas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Math.round(totalFichas)}</div>
              <p className="text-xs text-muted-foreground">Próxima semana</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Projetado</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{fmtBRL.format(totalValor)}</div>
              <p className="text-xs text-muted-foreground">Receita estimada</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Média</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{qualityMed.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Score de qualidade</p>
            </CardContent>
          </Card>
        </div>

        {/* Projection Table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>
              {selectedFilter 
                ? `Projeção para ${projectionType === 'scouter' ? 'Scouter' : 'Projeto'}: ${selectedFilter}`
                : `Projeção por ${projectionType === 'scouter' ? 'Scouter' : 'Projeto'} (Sem+1)`
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full overflow-auto">
            {projectionData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{projectionType === 'scouter' ? 'Scouter' : 'Projeto'}</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Meta/Sem</TableHead>
                    <TableHead>Média Semanal</TableHead>
                    <TableHead>Taxa Conversão</TableHead>
                    <TableHead>Proj. Conservadora</TableHead>
                    <TableHead>Proj. Provável</TableHead>
                    <TableHead>Proj. Agressiva</TableHead>
                    <TableHead>Valor Projetado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectionData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(row.tier_name)}`}>
                          {row.tier_name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{row.weekly_goal || 0}</TableCell>
                      <TableCell>{row.avg_weekly_fichas || 0}</TableCell>
                      <TableCell>{row.conversion_rate || 0}%</TableCell>
                      <TableCell className="text-blue-600">{Math.round(row.projecao_conservadora || 0)}</TableCell>
                      <TableCell className="font-semibold text-green-600">{Math.round(row.projecao_provavel || 0)}</TableCell>
                      <TableCell className="text-orange-600">{Math.round(row.projecao_agressiva || 0)}</TableCell>
                      <TableCell className="font-semibold">{fmtBRL.format((row.projecao_provavel || 0) * valorFicha)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum dado de projeção disponível</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedFilter 
                    ? `Não há dados suficientes para ${selectedFilter} nos últimos 30 dias`
                    : "Verifique se existem fichas cadastradas nos últimos 30 dias"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Série Semanal (histórico + projeção)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <RTooltip />
                <Line 
                  type="monotone" 
                  dataKey="fichas" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Como Calculamos as Projeções</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Base de Cálculo:</strong> Análise dos últimos 30 dias de fichas por {projectionType === 'scouter' ? 'scouter' : 'projeto'}
            </p>
            <p>
              <strong>Projeção Provável:</strong> 60% da média histórica semanal + 40% da tendência das últimas 2 semanas
            </p>
            <p>
              <strong>Projeção Conservadora:</strong> 75% da projeção provável (cenário mais cauteloso)
            </p>
            <p>
              <strong>Projeção Agressiva:</strong> 130% da projeção provável (cenário otimista)
            </p>
            <p>
              <strong>Classificação por Tier:</strong> Baseada na performance combinada (fichas semanais × taxa de conversão)
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Diamante: Performance ≥ 80 (Meta: 100 fichas/semana)</li>
              <li>Ouro: Performance ≥ 60 (Meta: 80 fichas/semana)</li>
              <li>Prata: Performance ≥ 40 (Meta: 60 fichas/semana)</li>
              <li>Bronze: Performance &lt; 40 (Meta: 40 fichas/semana)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}