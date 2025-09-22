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
import type { Lead, LeadsFilters } from '@/repositories/types'
import { formatDateBR } from '@/utils/dataHelpers'

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LeadsFilters>({})

  const filterOptions = [
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
      key: 'scouter',
      label: 'Scouter',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.scouter).filter(Boolean)))
        .map(scouter => ({ value: scouter, label: scouter }))
    },
    {
      key: 'projeto',
      label: 'Projeto', 
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.projetos).filter(Boolean)))
        .map(projeto => ({ value: projeto, label: projeto }))
    },
    {
      key: 'etapa',
      label: 'Status',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.etapa).filter(Boolean)))
        .map(etapa => ({ value: etapa, label: etapa }))
    }
  ]

  const tableColumns = [
    { 
      key: 'nome', 
      label: 'Nome', 
      sortable: true,
      formatter: (value: string) => (
        <div className="font-medium">{value}</div>
      )
    },
    { 
      key: 'scouter', 
      label: 'Scouter', 
      sortable: true 
    },
    { 
      key: 'projetos', 
      label: 'Projeto', 
      sortable: true 
    },
    { 
      key: 'modelo', 
      label: 'Modelo', 
      sortable: true 
    },
    { 
      key: 'etapa', 
      label: 'Status', 
      sortable: true,
      formatter: (value: string) => (
        <Badge 
          variant={getStatusVariant(value)} 
          className="rounded-xl"
        >
          {value}
        </Badge>
      )
    },
    { 
      key: 'data_criacao_ficha', 
      label: 'Data Criação', 
      sortable: true,
      formatter: (value: string) => value ? formatDateBR(value) : '-'
    },
    { 
      key: 'idade', 
      label: 'Idade', 
      sortable: true,
      formatter: (value: number) => value || '-'
    },
    {
      key: 'indicadores',
      label: 'Indicadores',
      formatter: (value: any, row: Lead) => {
        if (!row) return <div className="flex gap-1"></div>;
        return (
          <div className="flex gap-1">
            {row.cadastro_existe_foto === 'SIM' && (
              <Badge variant="secondary" className="text-xs rounded-xl">
                Foto
              </Badge>
            )}
            {row.presenca_confirmada === 'Sim' && (
              <Badge variant="outline" className="text-xs rounded-xl">
                Confirmado
              </Badge>
            )}
            {row.ficha_confirmada === 'Sim' && (
              <Badge variant="default" className="text-xs rounded-xl">
                Validado
              </Badge>
            )}
          </div>
        );
      }
    }
  ]

  useEffect(() => {
    loadLeads()
  }, [filters])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const data = await getLeads(filters)
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
    const leadsFilters: LeadsFilters = {
      scouter: newFilters.scouter,
      projeto: newFilters.projeto,
      etapa: newFilters.etapa,
      dataInicio: newFilters.dataInicio,
      dataFim: newFilters.dataFim
    }
    setFilters(leadsFilters)
  }

  const handleSearch = (term: string) => {
    console.log('Buscar:', term)
  }

  const handleExport = () => {
    console.log('Exportar dados')
  }

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
              data={leads}
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
              data={leads}
              title="Análise de Leads"
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}