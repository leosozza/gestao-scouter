import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Search, UserPlus, Award, Target } from 'lucide-react'

export default function Scouters() {
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - replace with actual data from your repositories
  const mockScouters = [
    {
      id: 1,
      nome: 'Ana Silva',
      tier: 'Scouter Premium',
      fichasSemanais: 75,
      metaSemanal: 80,
      taxaConversao: 85.2,
      qualityScore: 78.5,
      status: 'Ativo',
      avatar: null
    },
    {
      id: 2,
      nome: 'Carlos Oliveira',
      tier: 'Scouter Coach Bronze',
      fichasSemanais: 92,
      metaSemanal: 90,
      taxaConversao: 88.7,
      qualityScore: 82.1,
      status: 'Ativo',
      avatar: null
    },
    {
      id: 3,
      nome: 'Maria Santos',
      tier: 'Scouter Pleno',
      fichasSemanais: 45,
      metaSemanal: 60,
      taxaConversao: 72.3,
      qualityScore: 71.8,
      status: 'Ativo',
      avatar: null
    },
    {
      id: 4,
      nome: 'Roberto Silva',  
      tier: 'Scouter Iniciante',
      fichasSemanais: 32,
      metaSemanal: 40,
      taxaConversao: 68.9,
      qualityScore: 65.2,
      status: 'Ativo',
      avatar: null
    }
  ]

  const getTierColor = (tier: string) => {
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

  const filteredScouters = mockScouters.filter(scouter =>
    scouter.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scouter.tier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalFichas = mockScouters.reduce((acc, s) => acc + s.fichasSemanais, 0)
  const avgConversao = mockScouters.reduce((acc, s) => acc + s.taxaConversao, 0) / mockScouters.length
  const avgQuality = mockScouters.reduce((acc, s) => acc + s.qualityScore, 0) / mockScouters.length

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Scouters</h1>
          <p className="text-muted-foreground">
            Gerencie a equipe e acompanhe o desempenho individual
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scouters</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockScouters.length}</div>
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
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversão Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgConversao.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Taxa da equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quality Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgQuality.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Score da equipe</p>
            </CardContent>
          </Card>
        </div>

        {/* Scouters Table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>Lista de Scouters</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar scouter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-xl w-64"
                  />
                </div>
                <Button className="rounded-xl">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scouter</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Fichas/Sem</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Conversão</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScouters.map((scouter) => {
                    const performance = (scouter.fichasSemanais / scouter.metaSemanal) * 100
                    return (
                      <TableRow key={scouter.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={scouter.avatar} />
                              <AvatarFallback>
                                {scouter.nome.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{scouter.nome}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTierColor(scouter.tier)} className="rounded-xl">
                            {scouter.tier}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{scouter.fichasSemanais}</TableCell>
                        <TableCell>{scouter.metaSemanal}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`text-sm font-medium ${getPerformanceColor(performance)}`}>
                              {performance.toFixed(0)}%
                            </div>
                            <Progress value={Math.min(performance, 100)} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell>{scouter.taxaConversao.toFixed(1)}%</TableCell>
                        <TableCell>{scouter.qualityScore.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-xl">
                            {scouter.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              
              {filteredScouters.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum scouter encontrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tente ajustar a busca ou adicionar novos scouters
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