import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { AIAnalysis } from '@/components/shared/AIAnalysis'
import { TinderAnalysisModal } from '@/components/leads/TinderAnalysisModal'
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog'
import { Plus, Users, TrendingUp, Calendar, Phone, Heart, ThumbsUp, ThumbsDown, Clock } from 'lucide-react'
import { getLeads } from '@/repositories/leadsRepo'
import type { Lead, LeadsFilters } from '@/repositories/types'
import { formatDateBR } from '@/utils/dataHelpers'
import { toast } from 'sonner'

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LeadsFilters>({})
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([])
  const [showTinderModal, setShowTinderModal] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
      key: 'aprovado',
      label: 'Aprovado',
      sortable: true,
      formatter: (value: boolean | null | undefined) => {
        if (value === true) {
          return (
            <Badge variant="default" className="bg-green-500 rounded-xl">
              <Heart className="w-3 h-3 mr-1" fill="white" />
              Sim
            </Badge>
          );
        } else if (value === false) {
          return (
            <Badge variant="destructive" className="rounded-xl">
              <ThumbsDown className="w-3 h-3 mr-1" />
              Não
            </Badge>
          );
        } else {
          return (
            <Badge variant="outline" className="rounded-xl">
              <Clock className="w-3 h-3 mr-1" />
              Pendente
            </Badge>
          );
        }
      }
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
      setError(null)
      console.log('🔄 [Leads] Carregando leads com filtros:', filters)
      const data = await getLeads(filters)
      console.log('✅ [Leads] Leads carregados:', data.length)
      setLeads(data)
      
      if (data.length === 0) {
        console.warn('⚠️ [Leads] Nenhum lead encontrado. Verifique:')
        console.warn('   - Se existem dados na tabela "fichas" do Supabase')
        console.warn('   - Se os filtros não estão muito restritivos')
        console.warn('   - Se a conexão com Supabase está funcionando')
      }
    } catch (error) {
      console.error('❌ [Leads] Erro ao carregar leads:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar leads'
      setError(errorMessage)
      toast.error('Erro ao carregar leads', {
        description: errorMessage,
        duration: 5000,
      })
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

  const handleCreateSuccess = async () => {
    await loadLeads()
  }

  const handleStartAnalysis = () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione ao menos um lead para análise')
      return
    }
    setShowTinderModal(true)
  }

  const handleAnalysisComplete = async () => {
    // Refetch leads to show updated aprovado status
    await loadLeads()
    // Clear selection
    setSelectedLeads([])
    setShowTinderModal(false)
  }

  const handleSelectionChange = (selected: Lead[]) => {
    setSelectedLeads(selected)
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

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900">Erro ao Carregar Dados</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadLeads}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros Avançados */}
        <FilterHeader
          filters={filterOptions}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          title="Filtros de Leads"
          defaultExpanded={false}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {leads.filter(l => l.aprovado === true).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {leads.length > 0 ? ((leads.filter(l => l.aprovado === true).length / leads.length) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reprovados</CardTitle>
              <ThumbsDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {leads.filter(l => l.aprovado === false).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {leads.length > 0 ? ((leads.filter(l => l.aprovado === false).length / leads.length) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Para Analisar</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {leads.filter(l => l.aprovado === null || l.aprovado === undefined).length}
              </div>
              <p className="text-xs text-muted-foreground">Pendente análise</p>
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
                  <div className="flex gap-2">
                    <Button 
                      variant="default"
                      className="rounded-xl"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Lead
                    </Button>
                    <Button 
                      variant="default"
                      className="rounded-xl bg-pink-500 hover:bg-pink-600"
                      onClick={handleStartAnalysis}
                      disabled={selectedLeads.length === 0}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Iniciar Análise ({selectedLeads.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
            <DataTable
              data={leads}
              columns={tableColumns}
              searchable={true}
              exportable={true}
              selectable={true}
              onSelectionChange={handleSelectionChange}
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

      {/* Tinder Analysis Modal */}
      <TinderAnalysisModal
        open={showTinderModal}
        onClose={() => setShowTinderModal(false)}
        leads={selectedLeads}
        onComplete={handleAnalysisComplete}
      />

      {/* Create Lead Dialog */}
      <CreateLeadDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
      />
    </AppShell>
  )
}