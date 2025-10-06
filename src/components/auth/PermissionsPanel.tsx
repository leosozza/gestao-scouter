import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Permission {
  id: number;
  module: string;
  action: string;
  role_id: number;
  allowed: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

const MODULES = [
  { name: 'fichas', label: 'Fichas' },
  { name: 'leads', label: 'Leads' },
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'pagamentos', label: 'Pagamentos' },
  { name: 'configuracoes', label: 'Configurações' },
];

const ACTIONS = [
  { name: 'read', label: 'Visualizar' },
  { name: 'create', label: 'Criar' },
  { name: 'update', label: 'Editar' },
  { name: 'delete', label: 'Excluir' },
  { name: 'export', label: 'Exportar' },
];

export function PermissionsPanel() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
      if (data && data.length > 0) {
        setSelectedRole(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Erro ao carregar funções');
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module, action');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: string, action: string, roleId: number): boolean => {
    return permissions.some(
      (p) => p.module === module && p.action === action && p.role_id === roleId && p.allowed
    );
  };

  const togglePermission = async (module: string, action: string, roleId: number) => {
    try {
      const existingPermission = permissions.find(
        (p) => p.module === module && p.action === action && p.role_id === roleId
      );

      if (existingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('permissions')
          .update({ allowed: !existingPermission.allowed })
          .eq('id', existingPermission.id);

        if (error) throw error;

        // Update local state
        setPermissions(
          permissions.map((p) =>
            p.id === existingPermission.id ? { ...p, allowed: !p.allowed } : p
          )
        );
      } else {
        // Insert new permission
        const { data, error } = await supabase
          .from('permissions')
          .insert({
            module,
            action,
            role_id: roleId,
            allowed: true,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setPermissions([...permissions, data]);
      }

      toast.success('Permissão atualizada');
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões de Acesso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as permissões por função, similar ao Bitrix24
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedRole?.toString()} onValueChange={(v) => setSelectedRole(parseInt(v))}>
          <TabsList className="mb-4">
            {roles.map((role) => (
              <TabsTrigger key={role.id} value={role.id.toString()} className="capitalize">
                {role.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {roles.map((role) => (
            <TabsContent key={role.id} value={role.id.toString()}>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      {ACTIONS.map((action) => (
                        <TableHead key={action.name} className="text-center">
                          {action.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map((module) => (
                      <TableRow key={module.name}>
                        <TableCell className="font-medium">{module.label}</TableCell>
                        {ACTIONS.map((action) => (
                          <TableCell key={action.name} className="text-center">
                            <Checkbox
                              checked={hasPermission(module.name, action.name, role.id)}
                              onCheckedChange={() =>
                                togglePermission(module.name, action.name, role.id)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
