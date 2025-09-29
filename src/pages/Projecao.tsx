import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from 'recharts'
import { TrendingUp, Calculator, Target, Calendar, Filter } from 'lucide-react'
import { 
  fetchLinearProjection, 
  getAvailableFilters, 
  type LinearProjectionData, 
  type ProjectionType 
} from '@/repositories/projectionsRepo'
import { getAppSettings } from '@/repositories/settingsRepo'
import type { AppSettings } from '@/repositories/types'

export default function ProjecaoPage() {
  const [projectionData, setProjectionData] = useState<LinearProjectionData | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [projectionType, setProjectionType] = useState<ProjectionType>('scouter')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [availableFilters, setAvailableFilters] = useState<{ scouters: string[], projetos: string[] }>({ 
    scouters: [], 
    projetos: [] 
  })

  // Date inputs
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return firstDay.toISOString().slice(0, 10)
  })
  const [dataFim, setDataFim] = useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return lastDay.toISOString().slice(0, 10)
  })

  useEffect(() => {
    loadAvailableFilters()
  }, [])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadAvailableFilters = async () => {
    const filters = await getAvailableFilters()
    setAvailableFilters(filters)
  }

  const loadSettings = async () => {
    const appSettings = await getAppSettings()
    setSettings(appSettings)
  }

  const fetchData = async () => {
    if (!dataInicio || !dataFim) return
    
    setLoading(true)
    try {
      const params: any = {
        inicio: dataInicio,
        fim: dataFim,
        valor_ficha_padrao: settings?.valor_base_ficha || 10
      }

      if (selectedFilter && selectedFilter !== 'all') {
        if (projectionType === 'scouter') {
          params.scouter = selectedFilter
        } else {
          params.projeto = selectedFilter
        }
      }

      const projection = await fetchLinearProjection(params)
      setProjectionData(projection)
    } catch (error) {
      console.error('Error fetching projection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectionTypeChange = (type: ProjectionType) => {
    setProjectionType(type)
    setSelectedFilter('all') // Reset filter when changing type
  }

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtNumber = new Intl.NumberFormat('pt-BR')

  // Prepare chart data
  const chartData = projectionData ? [
    ...projectionData.serie_real.map(item => ({
      dia: item.dia,
      data: new Date(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      realizado: item.acumulado,
      projetado: null,
      type: 'real'
    })),
    ...projectionData.serie_proj.map(item => ({
      dia: item.dia,
      data: new Date(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      realizado: null,
      projetado: item.acumulado,
      type: 'proj'
    }))
  ].sort((a, b) => a.dia.localeCompare(b.dia)) : []

  const availableOptions = projectionType === 'scouter' ? availableFilters.scouters : availableFilters.projetos
  const filterLabel = projectionType === 'scouter' ? 'Scouter' : 'Projeto'

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
          <h1 className="text-3xl font-bold tracking-tight">Projeções Lineares</h1>
          <p className="text-muted-foreground">
            Análise de projeção diária baseada na performance do período selecionado
          </p>
        </div>

        {/* Filtros */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Configuração da Projeção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Tipo de Análise</Label>
                <Select value={projectionType} onValueChange={(value: ProjectionType) => handleProjectionTypeChange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scouter">Por Scouter</SelectItem>
                    <SelectItem value="projeto">Por Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">{filterLabel} Específico</Label>
                <Select
                  value={selectedFilter}
                  onValueChange={setSelectedFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Todos os ${projectionType === 'scouter' ? 'scouters' : 'projetos'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os {projectionType === 'scouter' ? 'scouters' : 'projetos'}</SelectItem>
                    {availableOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={fetchData} className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calcular Projeção
              </Button>
            </div>
          </CardContent>
        </Card>

        {projectionData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fichas Realizadas</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{fmtNumber.format(projectionData.realizado.fichas)}</div>
                  <p className="text-xs text-muted-foreground">
                    {projectionData.periodo.dias_passados} dias ({new Date(projectionData.periodo.inicio).toLocaleDateString('pt-BR')} - {new Date(projectionData.periodo.hoje_limite).toLocaleDateString('pt-BR')})
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Realizado</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{fmtBRL.format(projectionData.realizado.valor)}</div>
                  <p className="text-xs text-muted-foreground">Receita confirmada</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fichas Projetadas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{fmtNumber.format(projectionData.total_projetado.fichas)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total até {new Date(projectionData.periodo.fim).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Projetado</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{fmtBRL.format(projectionData.total_projetado.valor)}</div>
                  <p className="text-xs text-muted-foreground">Receita estimada total</p>
                </CardContent>
              </Card>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectionData.media_diaria.toFixed(1)} fichas/dia</div>
                  <p className="text-xs text-muted-foreground">Com base no período realizado</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor Médio/Ficha</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtBRL.format(projectionData.valor_medio_por_ficha)}</div>
                  <p className="text-xs text-muted-foreground">Média do período</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Dias Restantes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectionData.periodo.dias_restantes} dias</div>
                  <p className="text-xs text-muted-foreground">Para projeção</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Projeção Linear - Fichas Acumuladas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Linha contínua: realizado | Linha tracejada: projetado
                </p>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip 
                      labelFormatter={(label) => `Data: ${label}`}
                      formatter={(value: number, name: string) => [
                        value !== null ? fmtNumber.format(value) : '-',
                        name === 'realizado' ? 'Realizado' : 'Projetado'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="realizado" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                      name="Realizado"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projetado" 
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls={false}
                      name="Projetado"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Como Funciona a Projeção Linear</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Período Analisado:</strong> {new Date(projectionData.periodo.inicio).toLocaleDateString('pt-BR')} a {new Date(projectionData.periodo.fim).toLocaleDateString('pt-BR')} 
                  ({projectionData.periodo.dias_totais} dias)
                </p>
                <p>
                  <strong>Dias Realizados:</strong> {projectionData.periodo.dias_passados} dias até {new Date(projectionData.periodo.hoje_limite).toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <strong>Lógica de Cálculo:</strong> A projeção utiliza a média diária de fichas do período realizado ({projectionData.media_diaria.toFixed(1)} fichas/dia) 
                  multiplicada pelos {projectionData.periodo.dias_restantes} dias restantes.
                </p>
                <p>
                  <strong>Filtro Aplicado:</strong> {selectedFilter && selectedFilter !== 'all'
                    ? `${filterLabel}: ${selectedFilter}` 
                    : `Todos os ${projectionType === 'scouter' ? 'scouters' : 'projetos'}`}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {!projectionData && (
          <Card className="rounded-2xl">
            <CardContent className="text-center py-12">
              <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Configure sua Projeção</h3>
              <p className="text-muted-foreground mb-4">
                Selecione o período e os filtros desejados, depois clique em "Calcular Projeção"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}