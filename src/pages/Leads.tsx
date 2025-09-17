import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Download } from 'lucide-react'

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data - replace with actual data from your repositories
  const mockLeads = [
    {
      id: 1,
      nome: 'Ana Silva Santos',
      scouter: 'Carlos Oliveira',
      projeto: 'Projeto Fashion Week',
      etapa: 'Agendado',
      dataContato: '2024-01-15',
      telefone: '(11) 99999-0001',
      temFoto: true,
      interesse: true
    },
    {
      id: 2,
      nome: 'Maria José Costa',
      scouter: 'Ana Paula',
      projeto: 'Projeto Verão',
      etapa: 'Convertido',
      dataContato: '2024-01-14',
      telefone: '(11) 99999-0002',
      temFoto: true,
      interesse: false
    },
    {
      id: 3,
      nome: 'João Pedro Lima',
      scouter: 'Roberto Silva',
      projeto: 'Projeto Fashion Week',
      etapa: 'Contato',
      dataContato: '2024-01-13',
      telefone: '(11) 99999-0003',
      temFoto: false,
      interesse: true
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Convertido':
        return 'default'
      case 'Agendado':
        return 'secondary'
      case 'Contato':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const filteredLeads = mockLeads.filter(lead => {
    const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.scouter.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.etapa === statusFilter
    return matchesSearch && matchesStatus
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockLeads.length}</div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {mockLeads.filter(l => l.etapa === 'Convertido').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {mockLeads.filter(l => l.etapa === 'Agendado').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {mockLeads.filter(l => l.etapa === 'Contato').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Lista de Leads</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou scouter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl w-full sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl w-full sm:w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Convertido">Convertido</SelectItem>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Contato">Contato</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="rounded-xl">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Contato</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Indicadores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nome}</TableCell>
                      <TableCell>{lead.scouter}</TableCell>
                      <TableCell>{lead.projeto}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(lead.etapa)} className="rounded-xl">
                          {lead.etapa}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.dataContato}</TableCell>
                      <TableCell>{lead.telefone}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {lead.temFoto && (
                            <Badge variant="secondary" className="text-xs rounded-xl">
                              Foto
                            </Badge>
                          )}
                          {lead.interesse && (
                            <Badge variant="outline" className="text-xs rounded-xl">
                              Interesse
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum lead encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tente ajustar os filtros ou conectar uma fonte de dados
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}