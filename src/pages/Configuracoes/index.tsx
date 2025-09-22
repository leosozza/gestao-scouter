import { useState, useEffect } from 'react'
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
import { getAppSettings, saveAppSettings } from '@/repositories/settingsRepo'
import type { AppSettings } from '@/repositories/types'
import { toast } from 'sonner'

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('parametros')
  const [loading, setLoading] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [params, setParams] = useState({
    valorBaseFicha: '10',
    pesoFoto: '1.0',
    pesoConfirmada: '1.0',
    pesoContato: '1.0',
    pesoAgendado: '1.0',
    pesoCompareceu: '1.0',
    pesoInteresse: '1.0',
    pesoConclusaoPos: '1.0',
    pesoConclusaoNeg: '1.0',
    pesoSemInteresseDef: '1.0',
    pesoSemContato: '1.0',
    pesoSemInteresseMomento: '1.0',
    qualityThreshold: '50'
  })

  const [selectedTier, setSelectedTier] = useState('ouro')
  const [tierConfig, setTierConfig] = useState({
    ajudaCusto: '300'
  })

  const tiers = [
    { value: 'bronze', label: 'Bronze' },
    { value: 'prata', label: 'Prata' },
    { value: 'ouro', label: 'Ouro' },
    { value: 'diamante', label: 'Diamante' }
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const appSettings = await getAppSettings()
      if (appSettings) {
        setSettings(appSettings)
        setParams({
          valorBaseFicha: appSettings.valor_base_ficha.toString(),
          pesoFoto: appSettings.peso_foto.toString(),
          pesoConfirmada: appSettings.peso_confirmada.toString(),
          pesoContato: appSettings.peso_contato.toString(),
          pesoAgendado: appSettings.peso_agendado.toString(),
          pesoCompareceu: appSettings.peso_compareceu.toString(),
          pesoInteresse: appSettings.peso_interesse.toString(),
          pesoConclusaoPos: appSettings.peso_concl_pos.toString(),
          pesoConclusaoNeg: appSettings.peso_concl_neg.toString(),
          pesoSemInteresseDef: appSettings.peso_sem_interesse_def.toString(),
          pesoSemContato: appSettings.peso_sem_contato.toString(),
          pesoSemInteresseMomento: appSettings.peso_sem_interesse_momento.toString(),
          qualityThreshold: appSettings.quality_threshold.toString()
        })
        
        if (appSettings.ajuda_custo_tier[selectedTier]) {
          setTierConfig({
            ajudaCusto: appSettings.ajuda_custo_tier[selectedTier].toString()
          })
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      
      const updatedTierConfig = {
        ...settings?.ajuda_custo_tier || {},
        [selectedTier]: Number(tierConfig.ajudaCusto)
      }

      const settingsToSave = {
        valor_base_ficha: Number(params.valorBaseFicha),
        quality_threshold: Number(params.qualityThreshold),
        peso_foto: Number(params.pesoFoto),
        peso_confirmada: Number(params.pesoConfirmada),
        peso_contato: Number(params.pesoContato),
        peso_agendado: Number(params.pesoAgendado),
        peso_compareceu: Number(params.pesoCompareceu),
        peso_interesse: Number(params.pesoInteresse),
        peso_concl_pos: Number(params.pesoConclusaoPos),
        peso_concl_neg: Number(params.pesoConclusaoNeg),
        peso_sem_interesse_def: Number(params.pesoSemInteresseDef),
        peso_sem_contato: Number(params.pesoSemContato),
        peso_sem_interesse_momento: Number(params.pesoSemInteresseMomento),
        ajuda_custo_tier: updatedTierConfig
      }

      const saved = await saveAppSettings(settingsToSave)
      if (saved) {
        setSettings(saved)
        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleTierChange = (tier: string) => {
    setSelectedTier(tier)
    if (settings?.ajuda_custo_tier[tier]) {
      setTierConfig({
        ajudaCusto: settings.ajuda_custo_tier[tier].toString()
      })
    } else {
      setTierConfig({ ajudaCusto: '200' })
    }
  }

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
                  <Label htmlFor="valor-base-ficha">Valor Base Ficha (R$)</Label>
                  <Input 
                    id="valor-base-ficha"
                    type="number"
                    step="0.01"
                    value={params.valorBaseFicha}
                    onChange={(e) => setParams({...params, valorBaseFicha: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quality-threshold">Quality Threshold</Label>
                  <Input 
                    id="quality-threshold"
                    type="number"
                    value={params.qualityThreshold}
                    onChange={(e) => setParams({...params, qualityThreshold: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div></div>
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
                  <Label htmlFor="peso-confirmada">Peso Confirmada</Label>
                  <Input 
                    id="peso-confirmada"
                    type="number"
                    step="0.01"
                    value={params.pesoConfirmada}
                    onChange={(e) => setParams({...params, pesoConfirmada: e.target.value})}
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso-contato">Peso Contato</Label>
                  <Input 
                    id="peso-contato"
                    type="number"
                    step="0.01"
                    value={params.pesoContato}
                    onChange={(e) => setParams({...params, pesoContato: e.target.value})}
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
                  <Label htmlFor="peso-compareceu">Peso Compareceu</Label>
                  <Input 
                    id="peso-compareceu"
                    type="number"
                    step="0.01"
                    value={params.pesoCompareceu}
                    onChange={(e) => setParams({...params, pesoCompareceu: e.target.value})}
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
                <div className="col-span-full flex gap-2">
                  <Button 
                    className="rounded-xl" 
                    onClick={handleSaveSettings}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={loadSettings}
                    disabled={loading}
                  >
                    Recarregar
                  </Button>
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
                  <Label htmlFor="classificacao">Tier</Label>
                  <Select value={selectedTier} onValueChange={handleTierChange}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map(tier => (
                        <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div></div>
                <div className="col-span-full flex gap-2">
                  <Button 
                    className="rounded-xl"
                    onClick={handleSaveSettings}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={loadSettings}
                    disabled={loading}
                  >
                    Recarregar
                  </Button>
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