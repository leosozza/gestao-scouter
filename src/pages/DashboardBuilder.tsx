/**
 * Página principal do Dashboard Builder
 * Permite usuários criarem painéis customizados
 */

import { useState } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Plus, Save, Trash2, LayoutDashboard } from 'lucide-react';
import { DynamicWidget } from '@/components/dashboard/DynamicWidget';
import { WidgetConfigModal } from '@/components/dashboard/WidgetConfigModal';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import type { DashboardWidget, DashboardConfig } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardBuilder() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState('Meu Dashboard');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | undefined>();
  
  const {
    configs,
    defaultConfig,
    isLoading,
    saveDashboard,
    updateDashboard,
    deleteDashboard
  } = useDashboardConfig();
  
  const handleAddWidget = (widget: DashboardWidget) => {
    if (editingWidget) {
      // Atualizar widget existente
      setWidgets(widgets.map(w => w.id === widget.id ? widget : w));
      setEditingWidget(undefined);
    } else {
      // Adicionar novo widget
      setWidgets([...widgets, widget]);
    }
  };
  
  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setWidgetModalOpen(true);
  };
  
  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };
  
  const handleSaveDashboard = () => {
    const config: Omit<DashboardConfig, 'id' | 'created_at' | 'updated_at'> = {
      name: dashboardName,
      description: dashboardDescription,
      widgets,
      is_default: false
    };
    
    if (currentDashboardId) {
      updateDashboard.mutate({ ...config, id: currentDashboardId });
    } else {
      saveDashboard.mutate(config);
    }
    
    setSaveModalOpen(false);
  };
  
  const handleLoadDashboard = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (config) {
      setWidgets(config.widgets);
      setDashboardName(config.name);
      setDashboardDescription(config.description || '');
      setCurrentDashboardId(config.id);
    }
  };
  
  const handleNewDashboard = () => {
    setWidgets([]);
    setDashboardName('Novo Dashboard');
    setDashboardDescription('');
    setCurrentDashboardId(null);
  };
  
  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8" />
              Dashboard Builder
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie painéis personalizados para análise de dados
            </p>
          </div>
          <div className="flex gap-2">
            {/* Carregar Dashboard */}
            <Select value={currentDashboardId || ''} onValueChange={handleLoadDashboard}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Carregar dashboard salvo" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : configs.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Nenhum dashboard salvo
                  </div>
                ) : (
                  configs.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name} {config.is_default && '(Padrão)'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleNewDashboard}>
              Novo Dashboard
            </Button>
            <Button variant="outline" onClick={() => setSaveModalOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
            <Button onClick={() => setWidgetModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Painel
            </Button>
          </div>
        </div>
        
        {/* Dashboard Info */}
        <Card>
          <CardHeader>
            <CardTitle>{dashboardName}</CardTitle>
            {dashboardDescription && (
              <CardDescription>{dashboardDescription}</CardDescription>
            )}
          </CardHeader>
        </Card>
        
        {/* Grid de Widgets */}
        {widgets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <LayoutDashboard className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum painel criado</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">
                Comece adicionando seu primeiro painel. Escolha as dimensões, métricas e visualizações que deseja analisar.
              </p>
              <Button onClick={() => setWidgetModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Painel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {widgets.map(widget => (
              <DynamicWidget
                key={widget.id}
                config={widget}
                onEdit={handleEditWidget}
                onDelete={handleDeleteWidget}
              />
            ))}
          </div>
        )}
        
        {/* Modal de Configuração de Widget */}
        <WidgetConfigModal
          open={widgetModalOpen}
          onOpenChange={(open) => {
            setWidgetModalOpen(open);
            if (!open) setEditingWidget(undefined);
          }}
          onSave={handleAddWidget}
          initialWidget={editingWidget}
        />
        
        {/* Modal de Salvar Dashboard */}
        <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar Dashboard</DialogTitle>
              <DialogDescription>
                Dê um nome e descrição para seu dashboard
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Dashboard</Label>
                <Input
                  id="name"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  placeholder="Ex: Análise de Performance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={dashboardDescription}
                  onChange={(e) => setDashboardDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste dashboard..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveDashboard}>
                Salvar Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
