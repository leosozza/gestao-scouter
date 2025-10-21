# 🎯 Validação de Sincronização: TabuladorMax → Gestão Scouter

## ⚠️ Contexto
Este prompt deve ser aplicado no projeto **TabuladorMax** para validar e corrigir a configuração de exportação para o **Gestão Scouter**.

**Arquitetura:** PUSH Unidirecional  
**Direção:** TabuladorMax (fonte) → Gestão Scouter (destino)  
**Método:** Edge Function que envia dados via REST API

---

## ✅ Checklist de Validação

### 1. Edge Function Obrigatória

**Arquivo:** `supabase/functions/export-to-gestao-scouter-batch/index.ts`

**O que ela faz:**
- Recebe parâmetros de data início/fim
- Busca leads da tabela `leads` do TabuladorMax
- Aplica mapeamento de campos
- Envia em lotes de 50 para Gestão Scouter via POST `/rest/v1/leads`
- Usa `Prefer: resolution=merge-duplicates` para upserts
- Registra erros e sucessos

**Validação:**
```bash
# Verificar se o arquivo existe
ls -la supabase/functions/export-to-gestao-scouter-batch/index.ts

# Verificar se está no config.toml
grep "export-to-gestao-scouter-batch" supabase/config.toml
```

**Se não existir:** Criar esta Edge Function seguindo a especificação acima.

---

### 2. Edge Functions de Suporte (Opcionais mas Recomendadas)

#### 2.1. Validação de Schema

**Arquivo:** `supabase/functions/validate-gestao-scouter-schema/index.ts`

**O que faz:**
- Compara schema da tabela `leads` do TabuladorMax com Gestão Scouter
- Identifica campos faltantes no Gestão Scouter
- Retorna SQL para adicionar campos faltantes

**Uso:** Botão "Validar Schema" na interface

---

#### 2.2. Reload de Cache do PostgREST

**Arquivo:** `supabase/functions/reload-gestao-scouter-schema-cache/index.ts`

**O que faz:**
- Chama `POST /rest/v1/?` para forçar reload do schema cache
- Necessário após adicionar colunas no Gestão Scouter

**Uso:** Botão "Recarregar Cache" na interface

---

#### 2.3. Teste de Conexão

**Arquivo:** `supabase/functions/validate-gestao-scouter-config/index.ts`

**O que faz:**
- Testa credenciais (URL + Service Key)
- Verifica acesso à tabela `leads` via GET
- Retorna status da conexão

**Uso:** Botão "Testar Conexão" na interface

---

### 3. Credenciais Obrigatórias

**Secrets do Supabase:**

```bash
# Verificar se existem
supabase secrets list

# Devem existir:
# - GESTAO_URL=https://jstsrgyxrrlklnzgsihd.supabase.co
# - GESTAO_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE:** Deve ser a **Service Role Key** do Gestão Scouter, não a Anon Key!

**Se não existirem:**
```bash
# Adicionar via CLI
supabase secrets set GESTAO_URL=https://jstsrgyxrrlklnzgsihd.supabase.co
supabase secrets set GESTAO_SERVICE_KEY=<service_role_key_do_gestao_scouter>
```

---

### 4. Interface de Sincronização

**Arquivo:** `src/components/sync/GestaoScouterExportTab.tsx`

**O que deve ter:**
- Campo de data início
- Campo de data fim  
- Botão "Validar Schema"
- Botão "Recarregar Cache"
- Botão "Testar Conexão"
- Botão "Iniciar Exportação"
- Display de progresso (enviados, com erro, total)
- Botões Pausar/Retomar/Resetar
- Log de erros com detalhes

**Validação:**
```typescript
// Verificar se o arquivo existe
import { GestaoScouterExportTab } from '@/components/sync/GestaoScouterExportTab';

// Verificar se está integrado no painel de Configurações/Sync
```

---

### 5. Funções que NÃO Devem Existir

**❌ DELETAR se existirem:**
- `supabase/functions/get-leads-count/`
- `supabase/functions/get-leads-for-sync/`

**Motivo:** Estas funções implementavam um fluxo PULL que não é usado. O Gestão Scouter recebe dados via PUSH (tabela `leads` com RLS), não via Edge Functions.

**Validação:**
```bash
# Verificar se NÃO existem
ls supabase/functions/ | grep "get-leads"

# Se existirem, deletar:
rm -rf supabase/functions/get-leads-count
rm -rf supabase/functions/get-leads-for-sync

# Remover do config.toml
# Procurar e deletar seções [functions.get-leads-count] e [functions.get-leads-for-sync]
```

---

## 🧪 Testes de Validação

### Teste 1: Verificar Tabela Leads

```sql
-- Executar no SQL Editor do TabuladorMax
SELECT 
  COUNT(*) as total_leads,
  MIN(created_at) as primeiro_lead,
  MAX(created_at) as ultimo_lead
FROM public.leads;
```

**Resultado esperado:** Deve retornar quantidade de leads disponíveis

---

### Teste 2: Verificar Credenciais do Gestão Scouter

```typescript
// Criar um teste rápido em TypeScript
const GESTAO_URL = Deno.env.get('GESTAO_URL');
const GESTAO_KEY = Deno.env.get('GESTAO_SERVICE_KEY');

console.log('URL:', GESTAO_URL);
console.log('Key exists:', !!GESTAO_KEY);
console.log('Key length:', GESTAO_KEY?.length);

// Testar conexão
const response = await fetch(`${GESTAO_URL}/rest/v1/leads?limit=1`, {
  headers: {
    'Authorization': `Bearer ${GESTAO_KEY}`,
    'apikey': GESTAO_KEY,
  }
});

console.log('Status:', response.status);
console.log('Response:', await response.json());
```

**Resultado esperado:** Status 200, retorna array de leads (pode ser vazio)

---

### Teste 3: Exportação Manual

1. Abrir interface de Sincronização no TabuladorMax
2. Ir para aba "Gestão Scouter"
3. Clicar em "Testar Conexão" → Deve retornar ✅
4. Clicar em "Validar Schema" → Deve retornar ✅ ou SQL para corrigir
5. Selecionar data início = 2024-01-01
6. Selecionar data fim = 2024-12-31
7. Clicar em "Iniciar Exportação"
8. Acompanhar progresso (deve processar em lotes de 50)
9. Verificar log de erros (deve estar vazio ou mostrar erros específicos)

**Resultado esperado:** 
- Exportação completa sem erros
- No Gestão Scouter, verificar: `SELECT COUNT(*) FROM leads;`

---

## 🔧 Troubleshooting

### Erro: "Missing GESTAO_URL or GESTAO_SERVICE_KEY"

**Causa:** Secrets não configurados  
**Solução:**
```bash
supabase secrets set GESTAO_URL=https://jstsrgyxrrlklnzgsihd.supabase.co
supabase secrets set GESTAO_SERVICE_KEY=<service_role_key>
```

---

### Erro: "HTTP 401 Unauthorized"

**Causa:** Service Key incorreta ou expirada  
**Solução:** 
1. Ir no Gestão Scouter
2. Settings > API > Service Role Key (não confundir com Anon Key!)
3. Copiar nova key
4. Atualizar secret: `supabase secrets set GESTAO_SERVICE_KEY=<nova_key>`

---

### Erro: "Schema mismatch: column 'xyz' does not exist"

**Causa:** Gestão Scouter não tem todas as colunas da tabela `leads` do TabuladorMax  
**Solução:**
1. Clicar em "Validar Schema" na interface
2. Copiar o SQL retornado
3. Executar no SQL Editor do Gestão Scouter
4. Aguardar 30 segundos
5. Clicar em "Recarregar Cache"
6. Clicar novamente em "Validar Schema" → Deve retornar ✅

---

### Erro: "Edge Function 'get-leads-count' not found"

**Causa:** Código antigo tentando chamar função que não existe mais  
**Solução:**
1. Verificar se `get-leads-count` ou `get-leads-for-sync` existem
2. Se sim, deletar: `rm -rf supabase/functions/get-leads-*`
3. Verificar se há referências no código frontend
4. Remover qualquer código que chame essas funções

---

## 📋 Resumo do Estado Esperado

### ✅ Devem Existir:

**Edge Functions:**
1. `export-to-gestao-scouter-batch` (obrigatória)
2. `validate-gestao-scouter-schema` (recomendada)
3. `reload-gestao-scouter-schema-cache` (recomendada)
4. `validate-gestao-scouter-config` (recomendada)

**Secrets:**
1. `GESTAO_URL` = `https://jstsrgyxrrlklnzgsihd.supabase.co`
2. `GESTAO_SERVICE_KEY` = Service Role Key do Gestão Scouter

**Interface:**
1. `src/components/sync/GestaoScouterExportTab.tsx`
2. Integrada em Configurações > Sincronização

---

### ❌ NÃO Devem Existir:

**Edge Functions a deletar:**
1. `get-leads-count`
2. `get-leads-for-sync`

**Motivo:** Implementavam fluxo PULL desnecessário. O Gestão Scouter recebe via PUSH para tabela `leads` com RLS.

---

## 🎯 Próximos Passos Após Validação

1. ✅ Validar que todas as Edge Functions obrigatórias existem
2. ✅ Validar que credenciais estão configuradas
3. ✅ Deletar Edge Functions obsoletas (`get-leads-*`)
4. ✅ Testar conexão via interface
5. ✅ Validar schema via interface
6. ✅ Fazer exportação de teste (ex: últimos 30 dias)
7. ✅ Verificar dados no Gestão Scouter
8. ✅ Documentar qualquer customização adicional

---

## 📚 Referências

- **Arquitetura Completa:** `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md` (no projeto Gestão Scouter)
- **Schema da Tabela Leads:** Ver `supabase/migrations/` no Gestão Scouter
- **RLS Policies:** Ver documentação do Gestão Scouter

---

**Data de criação:** 2025-10-21  
**Versão:** 1.0  
**Status:** Arquitetura PUSH Unidirecional Validada
