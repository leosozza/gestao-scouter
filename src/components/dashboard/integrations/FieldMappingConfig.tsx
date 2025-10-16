import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function FieldMappingConfig() {
  const [selectedEntity, setSelectedEntity] = useState<'fichas' | 'scouters'>('fichas');

  const { data: mappings, isLoading, refetch } = useQuery({
    queryKey: ['field-mappings', selectedEntity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_mappings')
        .select('*')
        .eq('entity_type', selectedEntity)
        .order('supabase_field');
      
      if (error) throw error;
      return data;
    }
  });

  const addAliasMutation = useMutation({
    mutationFn: async ({ 
      mappingId, 
      newAlias 
    }: { 
      mappingId: string; 
      newAlias: string 
    }) => {
      const { data: current } = await supabase
        .from('field_mappings')
        .select('legacy_aliases')
        .eq('id', mappingId)
        .single();

      const currentAliases = (current?.legacy_aliases as string[]) || [];
      
      const { error } = await supabase
        .from('field_mappings')
        .update({
          legacy_aliases: [...currentAliases, newAlias],
          updated_at: new Date().toISOString()
        })
        .eq('id', mappingId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alias adicionado!');
      refetch();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Mapeamento de Campos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure como campos legados (Google Sheets) devem ser mapeados para campos do Supabase
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={selectedEntity === 'fichas' ? 'default' : 'outline'}
            onClick={() => setSelectedEntity('fichas')}
          >
            Fichas
          </Button>
          <Button
            variant={selectedEntity === 'scouters' ? 'default' : 'outline'}
            onClick={() => setSelectedEntity('scouters')}
          >
            Scouters
          </Button>
        </div>

        {isLoading ? (
          <p>Carregando...</p>
        ) : (
          <div className="space-y-4">
            {mappings?.map(mapping => (
              <MappingRow
                key={mapping.id}
                mapping={mapping}
                onAddAlias={(alias) => addAliasMutation.mutate({ 
                  mappingId: mapping.id, 
                  newAlias: alias 
                })}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MappingRow({ 
  mapping, 
  onAddAlias 
}: { 
  mapping: any; 
  onAddAlias: (alias: string) => void 
}) {
  const [newAlias, setNewAlias] = useState('');

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">{mapping.supabase_field}</Label>
          <p className="text-sm text-muted-foreground">{mapping.description}</p>
        </div>
        <Badge variant={mapping.is_required ? 'destructive' : 'secondary'}>
          {mapping.is_required ? 'Obrigatório' : 'Opcional'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {(mapping.legacy_aliases as string[])?.map((alias, idx) => (
          <Badge key={idx} variant="outline">
            {alias}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar novo alias..."
          value={newAlias}
          onChange={(e) => setNewAlias(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newAlias.trim()) {
              onAddAlias(newAlias.trim());
              setNewAlias('');
            }
          }}
        />
        <Button 
          size="sm" 
          onClick={() => {
            if (newAlias.trim()) {
              onAddAlias(newAlias.trim());
              setNewAlias('');
            }
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
