# Testing Bitrix24 Webhook Integration

This document provides sample payloads and instructions for testing the Bitrix webhook integration.

## Sample Test Payloads

### Test 1: Create New Lead (Full Payload)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: YOUR_SECRET_HERE" \
  -d '{
    "event": "ONCRMLEADADD",
    "data": {
      "FIELDS": {
        "ID": "12345",
        "TITLE": "Maria Santos - Modelo",
        "NAME": "Maria",
        "LAST_NAME": "Santos",
        "STAGE_ID": "NEW",
        "DATE_CREATE": "2025-01-15T14:30:00-03:00",
        "PHONE": [
          {
            "VALUE": "+55 11 98765-4321",
            "VALUE_TYPE": "WORK"
          }
        ],
        "MOBILE_PHONE": [
          {
            "VALUE": "+55 11 91234-5678",
            "VALUE_TYPE": "MOBILE"
          }
        ],
        "EMAIL": [
          {
            "VALUE": "maria.santos@email.com",
            "VALUE_TYPE": "WORK"
          }
        ],
        "ADDRESS": "Rua Exemplo, 123",
        "ADDRESS_CITY": "São Paulo",
        "ADDRESS_PROVINCE": "SP",
        "ADDRESS_POSTAL_CODE": "01234-567",
        "UF_CRM_LOCAL_ABORDAGEM": "Shopping Center Norte",
        "UF_CRM_ALTURA": "175",
        "UF_CRM_BUSTO": "88",
        "UF_CRM_CINTURA": "65",
        "UF_CRM_QUADRIL": "92",
        "UF_CRM_COR_OLHOS": "Castanhos",
        "UF_CRM_COR_CABELO": "Preto"
      }
    },
    "ts": "1642260000",
    "auth": {
      "domain": "seu-dominio.bitrix24.com.br"
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Lead synchronized successfully",
  "result": [
    {
      "id": "uuid-gerado-pelo-supabase",
      "bitrix_id": 12345,
      "etapa": "NEW",
      "primeiro_nome": "Maria",
      "nome_do_modelo": "Maria Santos - Modelo",
      ...
    }
  ]
}
```

### Test 2: Update Existing Lead

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: YOUR_SECRET_HERE" \
  -d '{
    "event": "ONCRMLEADUPDATE",
    "data": {
      "FIELDS": {
        "ID": "12345",
        "TITLE": "Maria Santos - Modelo Atualizado",
        "STAGE_ID": "IN_PROCESS",
        "DATE_CREATE": "2025-01-15T14:30:00-03:00"
      }
    }
  }'
```

### Test 3: Minimal Lead (Only Required Fields)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: YOUR_SECRET_HERE" \
  -d '{
    "data": {
      "FIELDS": {
        "ID": "67890",
        "STAGE_ID": "NEW",
        "DATE_CREATE": "2025-01-16T10:00:00Z"
      }
    }
  }'
```

### Test 4: Alternative Format (Direct FIELDS)

Some Bitrix24 configurations may send data in a slightly different format:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: YOUR_SECRET_HERE" \
  -d '{
    "FIELDS": {
      "ID": "11111",
      "TITLE": "Pedro Costa",
      "NAME": "Pedro",
      "STAGE_ID": "NEW"
    }
  }'
```

## Testing Authentication

### Test Invalid Secret (Should Return 403)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: wrong-secret" \
  -d '{
    "data": {
      "FIELDS": {
        "ID": "99999"
      }
    }
  }'
```

Expected response:
```
Forbidden
```
Status: 403

### Test Missing Secret (Should Return 403)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "FIELDS": {
        "ID": "99999"
      }
    }
  }'
```

## Verifying Data in Supabase

After sending test requests, verify the data was inserted correctly:

### SQL Query to Check Inserted Leads

```sql
-- View all test leads
SELECT 
  bitrix_id,
  etapa,
  primeiro_nome,
  nome_do_modelo,
  telefone_de_trabalho,
  celular,
  cidade,
  uf,
  created_at,
  updated_at
FROM bitrix_leads
WHERE bitrix_id IN (12345, 67890, 11111)
ORDER BY updated_at DESC;
```

### Check Most Recent Leads

```sql
SELECT 
  bitrix_id,
  etapa,
  primeiro_nome,
  nome_do_modelo,
  created_at
FROM bitrix_leads
ORDER BY created_at DESC
LIMIT 10;
```

### Count Leads by Stage

```sql
SELECT 
  etapa,
  COUNT(*) as total
FROM bitrix_leads
GROUP BY etapa
ORDER BY total DESC;
```

## Using in Frontend

After confirming the webhook works, use the data in your application:

```typescript
import { getBitrixLeads } from '@/repositories/leadsRepo';

// Fetch all leads
const allLeads = await getBitrixLeads();
console.log(`Total leads: ${allLeads.length}`);

// Fetch with filters
const newLeads = await getBitrixLeads({
  etapa: 'NEW',
  dataInicio: '2025-01-01',
  dataFim: '2025-01-31'
});
console.log(`New leads this month: ${newLeads.length}`);
```

## Monitoring Edge Function Logs

To view Edge Function execution logs:

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **bitrix-lead-upsert**
3. Click on **Logs** tab
4. You'll see:
   - Request details
   - Payload received
   - Success/error messages
   - Stack traces for errors

Look for log entries like:
```
Bitrix webhook received: {...}
Lead upserted successfully: [...]
```

Or error messages:
```
Error processing Bitrix webhook: Invalid or missing Bitrix ID
```

## Troubleshooting

### Lead Not Appearing After Webhook

1. **Check Edge Function logs** for errors
2. **Verify authentication** - Check X-Secret header
3. **Validate payload structure** - Ensure ID field is present
4. **Check database** directly with SQL query
5. **Review RLS policies** if using authenticated access

### Duplicate Leads

The upsert operation uses `bitrix_id` as the unique key, so:
- Same `bitrix_id` = UPDATE existing record
- New `bitrix_id` = INSERT new record

If you're seeing duplicates, check that `bitrix_id` is being set correctly.

### Missing Custom Fields

If custom fields aren't being saved:
1. Check the field mapping in the Edge Function
2. Update `index.ts` to map your specific Bitrix24 custom field codes
3. Redeploy the Edge Function: `supabase functions deploy bitrix-lead-upsert`

### Performance Issues

For high-volume webhooks:
1. Monitor Edge Function execution time in logs
2. Consider batching updates if Bitrix sends many webhooks quickly
3. Add database indexes on commonly queried fields
4. Implement caching in the frontend if appropriate

## Automated Testing

For automated testing in CI/CD pipelines, see the test script at:
`/tmp/test-bitrix-webhook.sh`

Make the script executable and run:
```bash
chmod +x test-bitrix-webhook.sh
export SUPABASE_PROJECT_ID="your-project-id"
export BITRIX_WEBHOOK_SECRET="your-secret"
./test-bitrix-webhook.sh
```
