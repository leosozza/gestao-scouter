import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-helper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, RefreshCw, Download, Search } from 'lucide-react';

interface AppRoute {
  id: number;
  module: string;
  route_path: string;
  route_name: string;
  description: string;
  is_active: boolean;
}

interface RoutePermission {
  id?: number;
  route_id: number;
  department: string | null;
  role: string | null;
  allowed: boolean;
}

const DEPARTMENTS = ['scouter', 'telemarketing', 'admin'] as const;
const ROLES = ['Agent', 'Supervisor', 'Manager', 'Admin'] as const;

export function RoutePermissionsManager() {
  const [routes, setRoutes] = useState<AppRoute[]>([]);
  const [permissions, setPermissions] = useState<RoutePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [modules, setModules] = useState<string[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, RoutePermission>>(new Map());

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRoutes(), fetchPermissions()]);
      toast.success('Dados carregados com sucesso');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('app_routes')
        .select('*')
        .eq('is_active', true)
        .order('module', { ascending: true })
        .order('route_path', { ascending: true });

      if (error) throw error;

      const routesData = (data || []) as AppRoute[];
      setRoutes(routesData);

      // Extract unique modules
      const uniqueModules = [...new Set(routesData.map((r) => r.module))];
      setModules(uniqueModules);
    } catch (error) {
      console.error('Error fetching routes:', error);
      throw error;
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('route_permissions')
        .select('*');

      if (error) throw error;

      setPermissions((data || []) as RoutePermission[]);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  };

  const getPermissionKey = (routeId: number, department: string | null, role: string | null): string => {
    return `${routeId}-${department || 'null'}-${role || 'null'}`;
  };

  const hasPermission = (routeId: number, department: string | null, role: string | null): boolean => {
    const key = getPermissionKey(routeId, department, role);
    
    // Check pending changes first
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!.allowed;
    }

    // Check existing permissions
    const permission = permissions.find(
      (p) => 
        p.route_id === routeId && 
        p.department === department && 
        p.role === role
    );

    return permission?.allowed || false;
  };

  const togglePermission = (routeId: number, department: string | null, role: string | null) => {
    const key = getPermissionKey(routeId, department, role);
    const currentAllowed = hasPermission(routeId, department, role);
    
    const newPermission: RoutePermission = {
      route_id: routeId,
      department,
      role,
      allowed: !currentAllowed,
    };

    const newChanges = new Map(pendingChanges);
    newChanges.set(key, newPermission);
    setPendingChanges(newChanges);
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) {
      toast.info('Nenhuma alteração pendente');
      return;
    }

    setSaving(true);
    try {
      const items = Array.from(pendingChanges.values());
      
      console.log('Saving batch permissions:', items);

      const { data, error } = await supabase.rpc('set_route_permissions_batch', {
        p_items: items,
      });

      if (error) throw error;

      console.log('Batch update result:', data);

      // Check for errors in result
      if (data?.errors && data.errors.length > 0) {
        console.warn('Some permissions failed to update:', data.errors);
        toast.warning(`${data.updated_count} permissões atualizadas, ${data.errors.length} falharam`);
      } else {
        toast.success(`${data?.updated_count || pendingChanges.size} permissões atualizadas com sucesso`);
      }

      // Clear pending changes and reload
      setPendingChanges(new Map());
      await fetchPermissions();
    } catch (error) {
      console.error('Error saving permissions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReload = () => {
    setPendingChanges(new Map());
    loadData();
  };

  const handleExportJSON = () => {
    const exportData = {
      routes,
      permissions: permissions.map((p) => ({
        route_id: p.route_id,
        department: p.department,
        role: p.role,
        allowed: p.allowed,
      })),
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-permissions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Exportado com sucesso');
  };

  const filteredRoutes = routes.filter((route) => {
    const matchesSearch = 
      searchTerm === '' ||
      route.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.route_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.module.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = selectedModule === 'all' || route.module === selectedModule;
    
    return matchesSearch && matchesModule;
  });

  // Group routes by module
  const groupedRoutes = filteredRoutes.reduce((acc, route) => {
    if (!acc[route.module]) {
      acc[route.module] = [];
    }
    acc[route.module].push(route);
    return acc;
  }, {} as Record<string, AppRoute[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">Carregando permissões de rotas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Permissões por Página</CardTitle>
        <CardDescription>
          Configure quais departamentos e funções podem acessar cada rota da aplicação.
          <span className="block mt-1 text-xs text-amber-600">
            ⚠️ Requer permissão de Admin
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, caminho ou módulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="text-sm font-medium mb-2 block">Módulo</label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Módulos</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module} value={module} className="capitalize">
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving || pendingChanges.size === 0}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Alterações
            {pendingChanges.size > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {pendingChanges.size}
              </span>
            )}
          </Button>
          <Button 
            onClick={handleReload} 
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </Button>
          <Button 
            onClick={handleExportJSON} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar JSON
          </Button>
        </div>

        {/* Permissions Matrix */}
        <div className="space-y-6">
          {Object.entries(groupedRoutes).map(([module, moduleRoutes]) => (
            <div key={module} className="space-y-2">
              <h3 className="text-lg font-semibold capitalize sticky top-0 bg-background py-2">
                {module}
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">
                          Rota
                        </TableHead>
                        <TableHead className="min-w-[150px]">Caminho</TableHead>
                        {DEPARTMENTS.map((dept) =>
                          ROLES.map((role) => (
                            <TableHead 
                              key={`${dept}-${role}`} 
                              className="text-center min-w-[80px]"
                            >
                              <div className="text-xs">
                                <div className="font-semibold">{dept}</div>
                                <div className="text-muted-foreground">{role}</div>
                              </div>
                            </TableHead>
                          ))
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moduleRoutes.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell className="font-medium sticky left-0 bg-background z-10">
                            <div>
                              <div>{route.route_name}</div>
                              {route.description && (
                                <div className="text-xs text-muted-foreground">
                                  {route.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {route.route_path}
                          </TableCell>
                          {DEPARTMENTS.map((dept) =>
                            ROLES.map((role) => {
                              const key = getPermissionKey(route.id, dept, role);
                              const isPending = pendingChanges.has(key);
                              
                              return (
                                <TableCell key={`${dept}-${role}`} className="text-center">
                                  <div className="flex items-center justify-center">
                                    <Checkbox
                                      checked={hasPermission(route.id, dept, role)}
                                      onCheckedChange={() => togglePermission(route.id, dept, role)}
                                      className={isPending ? 'border-yellow-500' : ''}
                                    />
                                  </div>
                                </TableCell>
                              );
                            })
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRoutes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma rota encontrada com os filtros aplicados.
          </div>
        )}

        {pendingChanges.size > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              ⚠️ Você tem {pendingChanges.size} alteração(ões) pendente(s). Clique em "Salvar Alterações" para aplicá-las.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
