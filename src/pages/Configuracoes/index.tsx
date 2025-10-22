import { useState } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Shield, UserCog, Database, Layers } from 'lucide-react'
import { IntegrationsPanel } from '@/components/dashboard/integrations/IntegrationsPanel'
import { UsersPanel } from '@/components/auth/UsersPanel'
import { PermissionsPanel } from '@/components/auth/PermissionsPanel'
import { BitrixSyncPanel } from '@/components/dashboard/integrations/BitrixSyncPanel'

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('usuarios')

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, permissões, importação e sincronização com TabuladorMax
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl">
            <TabsTrigger value="usuarios" className="rounded-xl">
              <UserCog className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="rounded-xl">
              <Shield className="h-4 w-4 mr-2" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="rounded-xl">
              <Database className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="bitrix" className="rounded-xl">
              <Layers className="h-4 w-4 mr-2" />
              Bitrix24
            </TabsTrigger>
          </TabsList>

          {/* Usuários */}
          <TabsContent value="usuarios" className="space-y-4">
            <UsersPanel />
          </TabsContent>

          {/* Permissões de Acesso */}
          <TabsContent value="permissoes" className="space-y-4">
            <PermissionsPanel />
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integracoes" className="space-y-4">
            <IntegrationsPanel />
          </TabsContent>

          {/* Bitrix24 */}
          <TabsContent value="bitrix" className="space-y-4">
            <BitrixSyncPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
