# Frontend Integration Guide

This document explains how to use the Bitrix24 webhook integration in the frontend application.

## Using getBitrixLeads() in Components

The `getBitrixLeads()` function is exported from `src/repositories/leadsRepo.ts` and can be used to fetch leads that have been synchronized from Bitrix24 via webhooks.

### Basic Usage

```typescript
import { getBitrixLeads } from '@/repositories/leadsRepo';

// In your component or hook
const fetchLeads = async () => {
  try {
    const leads = await getBitrixLeads();
    console.log(`Loaded ${leads.length} leads from Bitrix24`);
    return leads;
  } catch (error) {
    console.error('Error fetching Bitrix leads:', error);
    return [];
  }
};
```

### With React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { getBitrixLeads } from '@/repositories/leadsRepo';

export function useBitrixLeads(filters = {}) {
  return useQuery({
    queryKey: ['bitrix-leads', filters],
    queryFn: () => getBitrixLeads(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// In your component:
function MyComponent() {
  const { data: leads, isLoading, error } = useBitrixLeads({
    dataInicio: '2025-01-01',
    dataFim: '2025-01-31'
  });

  if (isLoading) return <div>Carregando leads...</div>;
  if (error) return <div>Erro ao carregar leads</div>;

  return (
    <div>
      <h2>Total de Leads: {leads?.length}</h2>
      {/* Render your leads */}
    </div>
  );
}
```

### Available Filters

The `getBitrixLeads()` function accepts a `LeadsFilters` object:

```typescript
interface LeadsFilters {
  dataInicio?: string;    // ISO date: '2025-01-01'
  dataFim?: string;       // ISO date: '2025-01-31'
  etapa?: string;         // Stage ID from Bitrix24
  scouter?: string;       // Partial match on first name
  projeto?: string;       // Partial match on project (when field is added)
}

// Example with all filters:
const filteredLeads = await getBitrixLeads({
  dataInicio: '2025-01-01',
  dataFim: '2025-01-31',
  etapa: 'NEW',
});
```

## Adding Webhook Info to BitrixIntegration Component

To add webhook setup information to the existing Bitrix integration UI, you can add a new tab:

### Location
`src/components/dashboard/integrations/BitrixIntegration.tsx`

### Add New Tab

Find the `<Tabs>` section and add a new `<TabsTrigger>` and `<TabsContent>`:

```tsx
<TabsList>
  <TabsTrigger value="connection">Conexão</TabsTrigger>
  <TabsTrigger value="webhook">Webhook Sync</TabsTrigger> {/* NEW */}
  <TabsTrigger value="oauth-helper">OAuth Helper</TabsTrigger>
  <TabsTrigger value="fields">Campos</TabsTrigger>
</TabsList>

{/* Add this new TabsContent */}
<TabsContent value="webhook" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Sincronização via Webhook</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configure o Bitrix24 para enviar webhooks automaticamente quando leads 
          são criados ou atualizados. Isso permite sincronização em tempo real.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>URL do Webhook</Label>
        <div className="flex gap-2">
          <Input 
            value={`https://seu-projeto.supabase.co/functions/v1/bitrix-lead-upsert`}
            readOnly
            className="font-mono text-sm"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(
                'https://seu-projeto.supabase.co/functions/v1/bitrix-lead-upsert'
              );
              toast({ title: "URL copiada!" });
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Substitua 'seu-projeto' pelo ID do seu projeto Supabase
        </p>
      </div>

      <div className="space-y-2">
        <Label>Header de Autenticação</Label>
        <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
          <div><strong>Name:</strong> X-Secret</div>
          <div><strong>Value:</strong> seu_segredo_configurado</div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Eventos para Configurar</Label>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><code>ONCRMLEADADD</code> - Quando um lead é criado</li>
          <li><code>ONCRMLEADUPDATE</code> - Quando um lead é atualizado</li>
        </ul>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => window.open('/BITRIX_WEBHOOK_SETUP.md', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Documentação Completa
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('/BITRIX_WEBHOOK_TESTING.md', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Guia de Testes
        </Button>
      </div>
    </CardContent>
  </Card>

  {/* Leads Status Card */}
  <Card>
    <CardHeader>
      <CardTitle>Status dos Leads Sincronizados</CardTitle>
    </CardHeader>
    <CardContent>
      <LeadsSyncStatus />
    </CardContent>
  </Card>
</TabsContent>
```

### Add Leads Status Component

Create a new component to show synced leads status:

```tsx
// In the same file or create a separate component
function LeadsSyncStatus() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ['bitrix-leads-status'],
    queryFn: () => getBitrixLeads(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <div>Carregando status...</div>;
  }

  const stats = {
    total: leads?.length || 0,
    today: leads?.filter(l => {
      const today = new Date().toISOString().split('T')[0];
      return l.criado?.startsWith(today);
    }).length || 0,
    byStage: leads?.reduce((acc, lead) => {
      acc[lead.etapa || 'Sem Etapa'] = (acc[lead.etapa || 'Sem Etapa'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total de Leads</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats.today}</div>
          <div className="text-sm text-muted-foreground">Hoje</div>
        </div>
      </div>

      <div>
        <Label>Leads por Etapa</Label>
        <div className="space-y-2 mt-2">
          {Object.entries(stats.byStage || {}).map(([stage, count]) => (
            <div key={stage} className="flex justify-between items-center">
              <span className="text-sm">{stage}</span>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Testing the Integration

### 1. Check if Edge Function is Deployed

```bash
# List deployed functions
supabase functions list

# Should show: bitrix-lead-upsert
```

### 2. Test with Sample Data

Use the test commands from `BITRIX_WEBHOOK_TESTING.md`:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: YOUR_SECRET" \
  -d '{"data":{"FIELDS":{"ID":"12345","STAGE_ID":"NEW"}}}'
```

### 3. Verify in Database

```sql
SELECT * FROM bitrix_leads ORDER BY created_at DESC LIMIT 5;
```

### 4. Test in Frontend

```typescript
import { getBitrixLeads } from '@/repositories/leadsRepo';

// In your component or console
const leads = await getBitrixLeads();
console.log('Bitrix Leads:', leads);
```

## Common Issues

### No Leads Returned

**Possible causes:**
1. Edge Function not deployed
2. Webhook not configured in Bitrix24
3. Authentication failing (wrong secret)
4. Table empty (no test data)

**Solution:**
- Check Edge Function logs in Supabase
- Test webhook manually with curl
- Verify database has data: `SELECT COUNT(*) FROM bitrix_leads`

### Leads Not Updating

**Possible causes:**
1. `bitrix_id` mismatch
2. RLS policies blocking updates
3. Webhook sending wrong format

**Solution:**
- Check `bitrix_webhook_logs` table for errors
- Verify RLS policies allow inserts/updates
- Review Edge Function logs for parsing errors

### Type Errors

**Possible causes:**
1. Lead interface doesn't match database schema
2. Missing fields in normalization function

**Solution:**
- Update `Lead` interface in `src/repositories/types.ts`
- Update `normalizeBitrixLead()` function
- Rebuild: `npm run build`

## Next Steps

1. ✅ Configure webhook in Bitrix24
2. ✅ Test with sample data
3. ✅ Verify data appears in database
4. ✅ Update UI components to use `getBitrixLeads()`
5. ⏳ Add custom field mappings as needed
6. ⏳ Implement real-time updates (optional)
7. ⏳ Add webhook retry logic (optional)

## Additional Resources

- [BITRIX_WEBHOOK_SETUP.md](../BITRIX_WEBHOOK_SETUP.md) - Complete setup guide
- [BITRIX_WEBHOOK_TESTING.md](../BITRIX_WEBHOOK_TESTING.md) - Testing guide
- [Bitrix24 REST API Docs](https://dev.1c-bitrix.ru/rest_help/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
