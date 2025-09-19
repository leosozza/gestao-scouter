import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Settings, Users, Plug } from 'lucide-react'
import { DataSourceSelector } from '@/components/dashboard/integrations/DataSourceSelector'

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('parametros')
  
  // Mock configuration state
  const [params, setParams] = useState({
    pesoFoto: '0.25',
    pesoInteresse: '0.25',
    pesoAgendado: '0.25',
    pesoComparecido: '0.25',
    qualityThreshold: '75'
  })

  const [selectedTier, setSelectedTier] = useState('Scouter Premium')
  const [tierConfig, setTierConfig] = useState({
    valorPorFicha: '18',
    ajudaCusto: '300',
    metaFichasSem: '80'
  })

  const tiers = [
    'Scouter Iniciante',
    'Scouter Pleno', 
    'Scouter Premium',
    'Scouter Coach Bronze',
    'Scouter Coach Prata',
    'Scouter Coach Ouro',
    'Gestor Operacional',
    'Gestor Administrativo'
  ]

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie parâmetros, classificações e integrações do sistema
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="parametros" className="rounded-xl">
              <Settings className="h-4 w-4 mr-2" />
              Parâmetros
            </TabsTrigger>
            <TabsTrigger value="classificacoes" className="rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Classificações
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="rounded-xl">
              <Plug className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
          </TabsList>

          {/* Parâmetros */}
          <TabsContent value="parametros" className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Indicadores e Pesos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="peso-foto">Peso Foto</Label>
                  <Input 
                    id="peso-foto"
                    type="number"
                    step="0.01"
                    value={params.pesoFoto}
                    onChange={(e) => setParams({...params, pesoFoto: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso-interesse">Peso Interesse</Label>
                  <Input 
                    id="peso-interesse"
                    type="number"
                    step="0.01"
                    value={params.pesoInteresse}
                    onChange={(e) => setParams({...params, pesoInteresse: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso-agendado">Peso Agendado</Label>
                  <Input 
                    id="peso-agendado"
                    type="number"
                    step="0.01"
                    value={params.pesoAgendado}
                    onChange={(e) => setParams({...params, pesoAgendado: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso-comparecido">Peso Comparecido</Label>
                  <Input 
                    id="peso-comparecido"
                    type="number"
                    step="0.01"
                    value={params.pesoComparecido}
                    onChange={(e) => setParams({...params, pesoComparecido: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">  
                  <Label htmlFor="quality-threshold">Threshold de Quality (bônus)</Label>
                  <Input 
                    id="quality-threshold"
                    type="number"
                    value={params.qualityThreshold}
                    onChange={(e) => setParams({...params, qualityThreshold: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="col-span-full flex gap-2">
                  <Button className="rounded-xl">Salvar</Button>
                  <Button variant="outline" className="rounded-xl">Recarregar</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classificações */}
          <TabsContent value="classificacoes" className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Regras por Classificação</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="classificacao">Classificação</Label>
                  <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map(tier => (
                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor-ficha">Valor por ficha (R$)</Label>
                  <Input 
                    id="valor-ficha"
                    type="number"
                    value={tierConfig.valorPorFicha}
                    onChange={(e) => setTierConfig({...tierConfig, valorPorFicha: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ajuda-custo">Ajuda de custo (R$/sem)</Label>
                  <Input 
                    id="ajuda-custo"
                    type="number"
                    value={tierConfig.ajudaCusto}
                    onChange={(e) => setTierConfig({...tierConfig, ajudaCusto: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-fichas">Meta fichas/sem</Label>
                  <Input 
                    id="meta-fichas"
                    type="number"
                    value={tierConfig.metaFichasSem}
                    onChange={(e) => setTierConfig({...tierConfig, metaFichasSem: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="col-span-full flex gap-2">
                  <Button className="rounded-xl">Salvar</Button>
                  <Button variant="outline" className="rounded-xl">Recarregar</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integracoes" className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Fontes de Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Fonte de Dados Ativa</Label>
                    <p className="text-sm text-muted-foreground">Selecione a fonte de dados principal</p>
                  </div>
                  <DataSourceSelector />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Google Sheets</div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Conectado
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    URL/ID da planilha pública
                  </div>
                  <Input 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                    className="rounded-xl" 
                  />
                  <Button className="rounded-xl w-full">Reconectar</Button>
                </div>
                
                <div className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Bitrix24</div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Não configurado
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Conexão via app local + proxy seguro
                  </div>
                  <div className="space-y-2">
                    <Input placeholder="Base URL" className="rounded-xl" />
                    <Input placeholder="App ID" className="rounded-xl" />
                    <Input placeholder="Redirect URL" className="rounded-xl" />
                  </div>
                  <Button className="rounded-xl w-full">Autorizar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}