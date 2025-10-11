# Bitrix24 to Supabase Webhook Integration

Este documento detalha como configurar a sincronização automática de leads do Bitrix24 para o Supabase via webhooks.

## Visão Geral

Quando um lead é criado ou atualizado no Bitrix24, o sistema enviará automaticamente os dados via webhook para uma Edge Function no Supabase, que processará e armazenará os dados na tabela `bitrix_leads`.

## Arquitetura

```
Bitrix24 Lead (Criar/Atualizar)
    ↓
Bitrix24 Webhook (ONCRMLEADADD / ONCRMLEADUPDATE)
    ↓
Supabase Edge Function (bitrix-lead-upsert)
    ↓
Tabela bitrix_leads (UPSERT via bitrix_id)
    ↓
Frontend (busca via getBitrixLeads())
```

## 1. Configuração do Supabase

### 1.1 Verificar Tabela no Banco de Dados

A tabela `bitrix_leads` deve existir com o schema adequado. Se não existir, execute a migration:

```sql
-- A migration já está em: supabase/migrations/20250916140843_25fb5ec8-80b3-4753-9a53-0960a925dbfd.sql
-- Execute: supabase migration up
```

Campos da tabela `bitrix_leads`:
- `id` (UUID, Primary Key)
- `bitrix_id` (INTEGER, UNIQUE) - ID do lead no Bitrix24
- `etapa` (TEXT) - Estágio do lead (STAGE_ID)
- `data_de_criacao_da_ficha` (TIMESTAMP) - Data de criação
- `primeiro_nome` (TEXT) - Nome do lead
- `nome_do_modelo` (TEXT) - Título do lead
- `telefone_de_trabalho` (TEXT) - Telefone
- `celular` (TEXT) - Celular
- `local_da_abordagem` (TEXT) - Local de abordagem
- `endereco`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep` - Dados de endereço
- `altura_cm`, `medida_do_busto`, `medida_da_cintura`, etc. - Dados físicos
- `created_at`, `updated_at` (TIMESTAMP) - Timestamps automáticos

### 1.2 Deploy da Edge Function

```bash
supabase functions deploy bitrix-lead-upsert
```

A Edge Function está em: `supabase/functions/bitrix-lead-upsert/index.ts`

### 1.3 Configurar Variáveis de Ambiente no Supabase

No dashboard do Supabase (Settings → Edge Functions → Secrets):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu_projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
BITRIX_WEBHOOK_SECRET=um_segredo_forte_aqui
# Ou reutilize o segredo existente:
SHEETS_SYNC_SHARED_SECRET=seu_segredo_compartilhado
```

**Importante**: Gere um segredo forte e único para `BITRIX_WEBHOOK_SECRET`.

## 2. Configuração do Bitrix24

### 2.1 Criar Webhook de Saída (Outbound Webhook)

1. Acesse seu Bitrix24 como **administrador**
2. Navegue para: **Aplicativos** → **Desenvolvedor** → **Outros** → **Webhooks de saída**
3. Clique em **Adicionar webhook**

### 2.2 Configurar Eventos do Webhook

Configure os seguintes eventos para enviar notificações:

- **ONCRMLEADADD** - Quando um lead é criado
- **ONCRMLEADUPDATE** - Quando um lead é atualizado

### 2.3 Configurar URL do Webhook

URL de destino (substitua `SEU_PROJETO` pelo ID do seu projeto Supabase):

```
https://SEU_PROJETO.supabase.co/functions/v1/bitrix-lead-upsert
```

### 2.4 Configurar Autenticação

Na configuração do webhook, você precisa adicionar um header customizado:

**Header Name**: `X-Secret`  
**Header Value**: (o mesmo valor de `BITRIX_WEBHOOK_SECRET` configurado no Supabase)

Alternativamente, se o Bitrix24 não suportar headers customizados diretamente, você pode:
1. Usar um intermediário (ex: Zapier, Make.com)
2. Adicionar o secret como query parameter: `?secret=seu_segredo` (menos seguro)
3. Configurar autenticação via IP allowlist no Supabase

## 3. Mapeamento de Campos

### 3.1 Campos Padrão do Bitrix24

A Edge Function mapeia automaticamente os seguintes campos:

| Campo Bitrix24 | Campo bitrix_leads | Descrição |
|----------------|-------------------|-----------|
| `ID` | `bitrix_id` | ID único do lead (chave de upsert) |
| `STAGE_ID` | `etapa` | Estágio do lead |
| `DATE_CREATE` | `data_de_criacao_da_ficha` | Data de criação |
| `NAME` | `primeiro_nome` | Primeiro nome |
| `TITLE` | `nome_do_modelo` | Título/nome completo |
| `PHONE[].VALUE` | `telefone_de_trabalho` | Telefone principal |
| `MOBILE_PHONE[].VALUE` | `celular` | Celular |
| `ADDRESS` | `endereco` | Endereço |
| `ADDRESS_CITY` | `cidade` | Cidade |
| `ADDRESS_PROVINCE` | `uf` | Estado/UF |
| `ADDRESS_POSTAL_CODE` | `cep` | CEP |

### 3.2 Campos Customizados (UF_CRM_*)

Para usar campos customizados do seu Bitrix24, você precisa:

1. **Identificar os códigos dos campos** no Bitrix24:
   - Vá em CRM → Configurações → Campos Personalizados → Leads
   - Anote os códigos (ex: `UF_CRM_1234567890`)

2. **Atualizar o mapeamento** na Edge Function se necessário:
   - Edite `supabase/functions/bitrix-lead-upsert/index.ts`
   - Localize a seção de mapeamento de campos
   - Adicione/atualize os mapeamentos conforme seus campos customizados

Exemplo de campos customizados já mapeados:
```typescript
local_da_abordagem: fields.UF_CRM_LOCAL_ABORDAGEM
altura_cm: fields.UF_CRM_ALTURA
medida_do_busto: fields.UF_CRM_BUSTO
cor_dos_olhos: fields.UF_CRM_COR_OLHOS
// etc.
```

## 4. Formato do Payload

### 4.1 Payload Enviado pelo Bitrix24

O Bitrix24 envia webhooks no seguinte formato:

```json
{
  "event": "ONCRMLEADADD",
  "data": {
    "FIELDS": {
      "ID": "123",
      "TITLE": "João Silva - Modelo",
      "NAME": "João",
      "LAST_NAME": "Silva",
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
          "VALUE": "joao.silva@email.com",
          "VALUE_TYPE": "WORK"
        }
      ],
      "ADDRESS": "Rua Exemplo",
      "ADDRESS_CITY": "São Paulo",
      "ADDRESS_PROVINCE": "SP",
      "ADDRESS_POSTAL_CODE": "01234-567",
      "UF_CRM_LOCAL_ABORDAGEM": "Shopping Center",
      "UF_CRM_ALTURA": "180",
      "UF_CRM_BUSTO": "92",
      "UF_CRM_CINTURA": "75",
      "UF_CRM_QUADRIL": "95"
    }
  },
  "ts": "1642260000",
  "auth": {
    "domain": "seu-dominio.bitrix24.com.br"
  }
}
```

### 4.2 Testando Manualmente

Para testar a Edge Function sem configurar o webhook, use curl:

```bash
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/bitrix-lead-upsert \
  -H "Content-Type: application/json" \
  -H "X-Secret: seu_segredo_aqui" \
  -d '{
    "event": "ONCRMLEADADD",
    "data": {
      "FIELDS": {
        "ID": "999",
        "TITLE": "Teste Lead",
        "NAME": "Teste",
        "STAGE_ID": "NEW",
        "DATE_CREATE": "2025-01-15T10:00:00Z",
        "PHONE": [{"VALUE": "11999999999"}]
      }
    }
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Lead synchronized successfully",
  "result": [
    {
      "id": "uuid-gerado",
      "bitrix_id": 999,
      "etapa": "NEW",
      ...
    }
  ]
}
```

## 5. Usando os Dados no Frontend

### 5.1 Importar e Usar o Repository

```typescript
import { getBitrixLeads } from '@/repositories/leadsRepo';

// Buscar todos os leads
const leads = await getBitrixLeads();

// Buscar com filtros
const filteredLeads = await getBitrixLeads({
  dataInicio: '2025-01-01',
  dataFim: '2025-01-31',
  etapa: 'NEW'
});
```

### 5.2 Interface Lead

Os dados retornados seguem a interface `Lead` definida em `src/repositories/types.ts`:

```typescript
interface Lead {
  id: number;              // bitrix_id
  nome: string;            // primeiro_nome
  modelo: string;          // nome_do_modelo
  etapa: string;           // etapa
  criado: string;          // data_de_criacao_da_ficha
  telefone?: string;       // telefone_de_trabalho ou celular
  local_da_abordagem?: string;
  // ... outros campos
}
```

## 6. Monitoramento e Troubleshooting

### 6.1 Verificar Logs da Edge Function

No Supabase Dashboard:
1. Navegue para **Edge Functions** → **bitrix-lead-upsert**
2. Clique em **Logs** para ver as execuções
3. Verifique erros de autenticação, parsing ou inserção

### 6.2 Verificar Dados Inseridos

Via SQL Editor no Supabase:

```sql
-- Ver todos os leads sincronizados
SELECT * FROM bitrix_leads 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver leads por bitrix_id específico
SELECT * FROM bitrix_leads 
WHERE bitrix_id = 123;

-- Contar leads por etapa
SELECT etapa, COUNT(*) 
FROM bitrix_leads 
GROUP BY etapa;
```

### 6.3 Problemas Comuns

**1. Erro 403 Forbidden**
- Verifique se o header `X-Secret` está correto
- Confirme que `BITRIX_WEBHOOK_SECRET` está configurado no Supabase

**2. Erro "Invalid or missing Bitrix ID"**
- O payload não contém o campo `ID`
- Verifique o formato do payload enviado pelo Bitrix24

**3. Erro de upsert**
- Verifique se a tabela `bitrix_leads` existe
- Confirme que `bitrix_id` tem constraint UNIQUE
- Verifique os logs da Edge Function para detalhes

**4. Leads não aparecem no frontend**
- Verifique se está usando `getBitrixLeads()` e não `getLeads()`
- Confirme que os dados existem na tabela: `SELECT * FROM bitrix_leads`
- Verifique filtros aplicados (data, etapa, etc.)

### 6.4 Tabela de Logs de Sincronização (Opcional)

Para facilitar troubleshooting, você pode criar uma tabela de logs:

```sql
CREATE TABLE bitrix_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,
  bitrix_id INTEGER,
  payload JSONB,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_webhook_logs_created ON bitrix_webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_bitrix_id ON bitrix_webhook_logs(bitrix_id);
```

## 7. Segurança

### 7.1 Recomendações

1. **Use HTTPS**: A URL da Edge Function já é HTTPS por padrão
2. **Rotação de Secrets**: Altere `BITRIX_WEBHOOK_SECRET` periodicamente
3. **IP Allowlist**: Configure firewall no Supabase para aceitar apenas IPs do Bitrix24
4. **Rate Limiting**: Configure rate limits na Edge Function se necessário
5. **Validação de Dados**: A Edge Function já valida campos obrigatórios

### 7.2 Row Level Security (RLS)

As políticas RLS já estão configuradas na migration:

```sql
-- Usuários podem visualizar todos os leads
CREATE POLICY "Users can view all bitrix_leads" 
ON public.bitrix_leads FOR SELECT USING (true);

-- Apenas usuários autenticados podem criar/atualizar
CREATE POLICY "Authenticated users can create bitrix_leads" 
ON public.bitrix_leads FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);
```

## 8. Próximos Passos

1. ✅ Edge Function criada e deployada
2. ✅ Tabela `bitrix_leads` configurada
3. ✅ Repository atualizado com `getBitrixLeads()`
4. ⏳ Configurar webhook no Bitrix24
5. ⏳ Testar sincronização com lead de teste
6. ⏳ Atualizar UI para consumir dados de `bitrix_leads`
7. ⏳ Configurar campos customizados conforme necessidade

## 9. Referências

- [Bitrix24 REST API - Webhooks](https://dev.1c-bitrix.ru/rest_help/general/events.php)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
