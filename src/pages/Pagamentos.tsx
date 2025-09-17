import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, DollarSign, CreditCard, FileText, Search, Filter } from 'lucide-react'

export default function Pagamentos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data - replace with actual data from your repositories  
  const mockPagamentos = [
    {
      id: 1,
      scouter: 'Ana Silva',
      periodo: '2024-01-01 - 2024-01-07',
      fichas: 75,
      valorFicha: 18.00,
      ajudaCusto: 300.00,
      bonusQuality: 45.00,
      valorTotal: 1695.00,
      status: 'Pago',
      dataPagamento: '2024-01-15'
    },
    {
      id: 2,
      scouter: 'Carlos Oliveira',
      periodo: '2024-01-01 - 2024-01-07', 
      fichas: 92,
      valorFicha: 20.00,
      ajudaCusto: 350.00,
      bonusQuality: 92.00,
      valorTotal: 2282.00,
      status: 'Pendente',
      dataPagamento: null
    },
    {
      id: 3,
      scouter: 'Maria Santos',
      periodo: '2024-01-01 - 2024-01-07',
      fichas: 45,
      valorFicha: 12.00,
      ajudaCusto: 200.00,
      bonusQuality: 0.00,
      valorTotal: 740.00,
      status: 'Processando',
      dataPagamento: null
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'default'
      case 'Pendente':
        return 'secondary'
      case 'Processando':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const filteredPagamentos = mockPagamentos.filter(pagamento => {
    const matchesSearch = pagamento.scouter.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || pagamento.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPago = mockPagamentos
    .filter(p => p.status === 'Pago')
    .reduce((acc, p) => acc + p.valorTotal, 0)
  
  const totalPendente = mockPagamentos
    .filter(p => p.status === 'Pendente')
    .reduce((acc, p) => acc + p.valorTotal, 0)
  
  const totalProcessando = mockPagamentos
    .filter(p => p.status === 'Processando')
    .reduce((acc, p) => acc + p.valorTotal, 0)

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos e remunerações da equipe de scouting
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {fmtBRL.format(totalPago)}
              </div>
              <p className="text-xs text-muted-foreground">Este período</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {fmtBRL.format(totalPendente)}
              </div>
              <p className="text-xs text-muted-foreground">A pagar</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processando</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {fmtBRL.format(totalProcessando)}
              </div>
              <p className="text-xs text-muted-foreground">Em análise</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmtBRL.format(totalPago + totalPendente + totalProcessando)}
              </div>
              <p className="text-xs text-muted-foreground">Valor total</p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por scouter..."
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
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Processando">Processando</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="rounded-xl">Processar Lote</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Fichas</TableHead>
                    <TableHead>R$/Ficha</TableHead>
                    <TableHead>Ajuda Custo</TableHead>
                    <TableHead>Bônus Quality</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPagamentos.map((pagamento) => (
                    <TableRow key={pagamento.id}>
                      <TableCell className="font-medium">{pagamento.scouter}</TableCell>
                      <TableCell className="text-sm">{pagamento.periodo}</TableCell>
                      <TableCell>{pagamento.fichas}</TableCell>
                      <TableCell>{fmtBRL.format(pagamento.valorFicha)}</TableCell>
                      <TableCell>{fmtBRL.format(pagamento.ajudaCusto)}</TableCell>
                      <TableCell>{fmtBRL.format(pagamento.bonusQuality)}</TableCell>
                      <TableCell className="font-medium">
                        {fmtBRL.format(pagamento.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(pagamento.status)} className="rounded-xl">
                          {pagamento.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pagamento.dataPagamento || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredPagamentos.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tente ajustar os filtros ou processar novos pagamentos
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