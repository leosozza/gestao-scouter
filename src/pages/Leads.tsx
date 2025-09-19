import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { AIAnalysis } from '@/components/shared/AIAnalysis'
import { Download, Users, TrendingUp, Calendar, Phone } from 'lucide-react'
import { getLeads } from '@/repositories/leadsRepo'

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterOptions = [
    {
      key: 'etapa',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'Convertido', label: 'Convertido' },
        { value: 'Agendado', label: 'Agendado' },
        { value: 'Contato', label: 'Em Contato' },
        { value: 'Novo', label: 'Novo Lead' }
      ]
    },
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
      key: 'dataContato',
      label: 'Período',
      type: 'dateRange' as const
    },
    {
      key: 'temFoto',
      label: 'Tem Foto',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Sim' },
        { value: 'false', label: 'Não' }
      ]
    }
  ]

  const tableColumns = [
    { 
      key: 'nome', 
      label: 'Nome', 
      sortable: true,
      render: (value: string, row: any) => (
        <div className="font-medium">{value}</div>
      )
    },
    { 
      key: 'scouter', 
      label: 'Scouter', 
      sortable: true 
    },
    { 
      key: 'projeto', 
      label: 'Projeto', 
      sortable: true 
    },
    { 
      key: 'etapa', 
      label: 'Status', 
      sortable: true,
      render: (value: string) => (
        <Badge 
          variant={getStatusVariant(value)} 
          className="rounded-xl"
        >
          {value}
        </Badge>
      )
    },
    { 
      key: 'data_contato', 
      label: 'Data Contato', 
      sortable: true,
      render: (value: string) => 
        value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'telefone', 
      label: 'Telefone', 
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {value || '-'}
        </div>
      )
    },
    {
      key: 'indicadores',
      label: 'Indicadores',
      render: (_: any, row: any) => (
        <div className="flex gap-1">
          {row.tem_foto && (
            <Badge variant="secondary" className="text-xs rounded-xl">
              Foto
            </Badge>
          )}
          {row.interesse && (
            <Badge variant="outline" className="text-xs rounded-xl">
              Interesse
            </Badge>
          )}
        </div>
      )
    }
  ]

  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const data = await getLeads()
      setLeads(data)
    } catch (error) {
      console.error('Erro ao carregar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Convertido': return 'default'
      case 'Agendado': return 'secondary'
      case 'Contato': return 'outline'
      default: return 'outline'
    }
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
    // Aplicar filtros aos dados
  }

  const handleSearch = (term: string) => {
    // Implementar busca
    console.log('Buscar:', term)
  }

  const handleExport = () => {
    // Implementar exportação
    console.log('Exportar dados')
  }

  const filteredLeads = leads.filter(lead => {
    if (filters.etapa && lead.etapa !== filters.etapa) return false
    if (filters.projeto && lead.projeto !== filters.projeto) return false
    if (filters.scouter && !lead.scouter?.toLowerCase().includes(filters.scouter.toLowerCase())) return false
    return true
  })

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Gerencie todos os leads capturados pela equipe de scouting
          </p>
        </div>

        {/* Filtros Avançados */}
        <FilterHeader
          filters={filterOptions}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          title="Filtros de Leads"
          defaultExpanded={false}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
              <p className="text-xs text-muted-foreground">Total capturado</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.etapa === 'Convertido').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {leads.length > 0 ? ((leads.filter(l => l.etapa === 'Convertido').length / leads.length) * 100).toFixed(1) : 0}% taxa
              </p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendados</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {leads.filter(l => l.etapa === 'Agendado').length}
              </div>
              <p className="text-xs text-muted-foreground">Para conversão</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Contato</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {leads.filter(l => l.etapa === 'Contato').length}
              </div>
              <p className="text-xs text-muted-foreground">Em negociação</p>
            </CardContent>
          </Card>
        </div>

        {/* Grid com Tabela e Análise AI */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            {/* Tabela de Leads */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Lista de Leads</CardTitle>
                  <Button 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
            <DataTable
              data={filteredLeads}
              columns={tableColumns}
              searchable={true}
              exportable={true}
              actions={{
                view: (row) => console.log('Ver lead:', row),
                edit: (row) => console.log('Editar lead:', row)
              }}
            />
              </CardContent>
            </Card>
          </div>

          <div>
            {/* AI Analysis */}
            <AIAnalysis 
              data={filteredLeads}
              title="Análise de Leads"
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}