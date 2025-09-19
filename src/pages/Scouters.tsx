import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { AIAnalysis } from '@/components/shared/AIAnalysis'
import { UserPlus, Award, Target, TrendingUp, Users } from 'lucide-react'
import { getLeads } from '@/repositories/leadsRepo'

export default function Scouters() {
  const [scouters, setScouters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterOptions = [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select' as const,
      options: [
        { value: 'premium', label: 'Premium' },
        { value: 'coach', label: 'Coach' },
        { value: 'pleno', label: 'Pleno' },
        { value: 'iniciante', label: 'Iniciante' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
        { value: 'ferias', label: 'Férias' }
      ]
    },
    {
      key: 'performance',
      label: 'Performance Mín.',
      type: 'number' as const,
      placeholder: 'Ex: 80'
    }
  ]

  const tableColumns = [
    {
      key: 'nome',
      label: 'Scouter',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar} />
            <AvatarFallback>
              {value.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium">{value}</div>
        </div>
      )
    },
    {
      key: 'tier',
      label: 'Tier',
      sortable: true,
      render: (value: string) => (
        <Badge variant={getTierVariant(value)} className="rounded-xl">
          {value}
        </Badge>
      )
    },
    { key: 'fichasSemanais', label: 'Fichas/Sem', sortable: true },
    { key: 'metaSemanal', label: 'Meta', sortable: true },
    {
      key: 'performance',
      label: 'Performance',
      sortable: true,
      render: (_: any, row: any) => {
        const performance = (row.fichasSemanais / row.metaSemanal) * 100
        return (
          <div className="space-y-1">
            <div className={`text-sm font-medium ${getPerformanceColor(performance)}`}>
              {performance.toFixed(0)}%
            </div>
            <Progress value={Math.min(performance, 100)} className="h-1" />
          </div>
        )
      }
    },
    { 
      key: 'taxaConversao', 
      label: 'Conversão', 
      sortable: true,
      render: (value: number) => `${value.toFixed(1)}%`
    },
    { 
      key: 'qualityScore', 
      label: 'Quality', 
      sortable: true,
      render: (value: number) => value.toFixed(1)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant="secondary" className="rounded-xl">
          {value}
        </Badge>
      )
    }
  ]

  useEffect(() => {
    loadScouters()
  }, [])

  const loadScouters = async () => {
    try {
      setLoading(true)
      const leads = await getLeads()
      
      // Agrupar por scouter e calcular métricas
      const scouterStats = new Map()
      
      leads.forEach(lead => {
        if (!lead.scouter) return
        
        if (!scouterStats.has(lead.scouter)) {
          scouterStats.set(lead.scouter, {
            nome: lead.scouter,
            fichasSemanais: 0,
            convertidos: 0,
            tier: getTierFromCount(0),
            metaSemanal: 40,
            status: 'Ativo',
            avatar: null
          })
        }
        
        const stats = scouterStats.get(lead.scouter)
        stats.fichasSemanais++
        
        if (lead.etapa === 'Convertido') {
          stats.convertidos++
        }
      })
      
      // Converter Map para array e calcular métricas
      const scoutersData = Array.from(scouterStats.values()).map((scouter, index) => ({
        id: index + 1,
        ...scouter,
        tier: getTierFromCount(scouter.fichasSemanais),
        metaSemanal: getTierMeta(scouter.fichasSemanais),
        taxaConversao: scouter.fichasSemanais > 0 ? (scouter.convertidos / scouter.fichasSemanais) * 100 : 0,
        qualityScore: Math.random() * 30 + 70 // Mock quality score
      }))
      
      setScouters(scoutersData)
    } catch (error) {
      console.error('Erro ao carregar scouters:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierFromCount = (count: number) => {
    if (count >= 80) return 'Scouter Coach Bronze'
    if (count >= 60) return 'Scouter Premium'
    if (count >= 40) return 'Scouter Pleno'
    return 'Scouter Iniciante'
  }

  const getTierMeta = (count: number) => {
    if (count >= 80) return 90
    if (count >= 60) return 80
    if (count >= 40) return 60
    return 40
  }

  const getTierVariant = (tier: string) => {
    if (tier.includes('Coach')) return 'default'
    if (tier.includes('Premium')) return 'secondary'
    if (tier.includes('Pleno')) return 'outline'
    return 'outline'
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 75) return 'text-blue-600'
    if (percentage >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
  }

  const handleSearch = (term: string) => {
    console.log('Buscar scouter:', term)
  }

  const filteredScouters = scouters.filter(scouter => {
    if (filters.tier && !scouter.tier.toLowerCase().includes(filters.tier)) return false
    if (filters.status && scouter.status !== filters.status) return false
    if (filters.performance && (scouter.fichasSemanais / scouter.metaSemanal) * 100 < filters.performance) return false
    return true
  })

  const totalFichas = scouters.reduce((acc, s) => acc + s.fichasSemanais, 0)
  const avgConversao = scouters.length > 0 ? scouters.reduce((acc, s) => acc + s.taxaConversao, 0) / scouters.length : 0
  const avgQuality = scouters.length > 0 ? scouters.reduce((acc, s) => acc + s.qualityScore, 0) / scouters.length : 0

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Scouters</h1>
          <p className="text-muted-foreground">
            Gerencie a equipe e acompanhe o desempenho individual
          </p>
        </div>

        {/* Filtros Avançados */}
        <FilterHeader
          filters={filterOptions}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          title="Filtros de Scouters"
          defaultExpanded={false}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scouters</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scouters.length}</div>
              <p className="text-xs text-muted-foreground">Ativos na equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichas/Semana</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFichas}</div>
              <p className="text-xs text-muted-foreground">Total da equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão Média</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgConversao.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Taxa da equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Médio</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgQuality.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Score da equipe</p>
            </CardContent>
          </Card>
        </div>

        {/* Grid com Tabela e Análise AI */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            {/* Tabela de Scouters */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Lista de Scouters</CardTitle>
                  <Button className="rounded-xl">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
            <DataTable
              data={filteredScouters}
              columns={tableColumns}
              searchable={true}
              exportable={true}
              actions={{
                view: (row) => console.log('Ver scouter:', row),
                edit: (row) => console.log('Editar scouter:', row)
              }}
            />
              </CardContent>
            </Card>
          </div>

          <div>
            {/* AI Analysis */}
            <AIAnalysis 
              data={filteredScouters}
              title="Análise de Performance"
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}