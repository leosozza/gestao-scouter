import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from 'recharts'
import { TrendingUp, Calculator, Target } from 'lucide-react'
import { getProjectionData, type ProjectionData } from '@/repositories/projectionsRepo'

export default function ProjecaoPage() {
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjectionData()
  }, [])

  const fetchProjectionData = async () => {
    setLoading(true)
    try {
      const data = await getProjectionData()
      setProjectionData(data)
    } catch (error) {
      console.error('Error fetching projection data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary metrics
  const totalFichas = projectionData.reduce((acc, row) => acc + (row.projecao_provavel || 0), 0)
  const totalValor = totalFichas * 15 // Assuming R$15 per ficha
  const qualityMed = projectionData.length > 0 ? 75.5 : 0 // Mock quality average

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

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
            <CardTitle>Projeção por Scouter (Sem+1)</CardTitle>
          </CardHeader>
          <CardContent className="w-full overflow-auto">
            {projectionData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Meta/Sem</TableHead>
                    <TableHead>Fichas Proj.</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>R$ por ficha</TableHead>
                    <TableHead>Valor Projetado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectionData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.scouter_name || 'N/A'}</TableCell>
                      <TableCell>{row.tier_name || 'N/A'}</TableCell>
                      <TableCell>{row.weekly_goal || 0}</TableCell>
                      <TableCell>{Math.round(row.projecao_provavel || 0)}</TableCell>
                      <TableCell>75.0</TableCell>
                      <TableCell>15.00</TableCell>
                      <TableCell>{fmtBRL.format((row.projecao_provavel || 0) * 15)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum dado de projeção disponível</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Configure a conexão com sua fonte de dados em Configurações
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
            <CardTitle>Como Calculamos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Média móvel ponderada (6 semanas) com pesos 1,1,2,2,3,4; ajuste por constância e qualidade; 
              aplicação de bônus/penalidades por tier; ajuda de custo somada ao total.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}