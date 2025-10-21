# Auto-Sync de Schema: TabuladorMax → Gestão Scouter

## 📋 Visão Geral

O **Auto-Sync de Schema** é um recurso automático que sincroniza a estrutura da tabela `leads` entre TabuladorMax e Gestão Scouter, eliminando erros de campos faltantes e garantindo compatibilidade perfeita entre os projetos.

## 🎯 Problema que Resolve

Quando o TabuladorMax tenta enviar dados para o Gestão Scouter, podem ocorrer erros como:

- `PGRST204` - Coluna não encontrada
- `42501` - Insufficient privilege
- `Schema mismatch` - Campos faltando

Isso acontece quando:
1. TabuladorMax adiciona novos campos na tabela `leads`
2. Gestão Scouter ainda não possui esses campos
3. A sincronização falha ao tentar inserir dados

## ✨ Solução Automática

O Auto-Sync **analisa ambos os schemas**, identifica diferenças e adiciona automaticamente as colunas faltantes no Gestão Scouter.

## 🚀 Como Usar

### 1. Acesse a Interface

1. Vá para **Configurações → Integrações → TabuladorMax**
2. Localize o botão **"🔄 Sincronizar Schema"**

### 2. Execute a Sincronização

1. Clique em **"Sincronizar Schema"**
2. Confirme a ação no diálogo que aparecer
3. Aguarde 5-15 segundos enquanto o sistema:
   - Analisa o schema do TabuladorMax
   - Analisa o schema do Gestão Scouter
   - Identifica colunas faltantes
   - Adiciona as colunas necessárias
   - Cria índices para otimização
   - Recarrega o schema cache

### 3. Resultado

Você verá um toast com o resultado:

- ✅ **Sucesso:** "X coluna(s) adicionada(s) e Y índice(s) criado(s)"
- ✅ **Já atualizado:** "Todas as colunas já estão atualizadas!"
- ❌ **Erro:** Mensagem detalhada do problema

## 🔧 Como Funciona Internamente

### Edge Function: `sync-schema-from-tabulador`

```typescript
// 1. Conecta em ambos os projetos
const tabuladorClient = createClient(TABULADOR_URL, TABULADOR_SERVICE_KEY);
const gestaoClient = createClient(GESTAO_URL, GESTAO_SERVICE_KEY);

// 2. Lê schemas via information_schema.columns
const tabuladorColumns = await tabuladorClient
  .from('information_schema.columns')
  .select('column_name, data_type, is_nullable, column_default')
  .eq('table_name', 'leads');

const gestaoColumns = await gestaoClient
  .from('information_schema.columns')
  .select('column_name, data_type, is_nullable, column_default')
  .eq('table_name', 'leads');

// 3. Identifica colunas faltantes
const missingColumns = tabuladorColumns.filter(
  col => !gestaoColumns.find(gc => gc.column_name === col.column_name)
);

// 4. Gera SQL
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS campo_novo_1 TEXT,
ADD COLUMN IF NOT EXISTS campo_novo_2 INTEGER,
ADD COLUMN IF NOT EXISTS campo_novo_3 TIMESTAMPTZ;

// 5. Cria índices
CREATE INDEX IF NOT EXISTS idx_leads_campo_novo_1 ON public.leads(campo_novo_1);

// 6. Recarrega cache
NOTIFY pgrst, 'reload schema';
```

### Fluxo de Dados

```
┌─────────────────────┐
│   TabuladorMax      │
│   Schema Analysis   │
└──────────┬──────────┘
           │
           │ Read information_schema.columns
           │
           ▼
┌─────────────────────┐
│  Gestão Scouter     │
│  Schema Analysis    │
└──────────┬──────────┘
           │
           │ Compare schemas
           │
           ▼
┌─────────────────────┐
│  Generate SQL       │
│  - ALTER TABLE      │
│  - CREATE INDEX     │
│  - NOTIFY pgrst     │
└──────────┬──────────┘
           │
           │ Execute SQL
           │
           ▼
┌─────────────────────┐
│  Gestão Scouter     │
│  Schema Updated ✅  │
└─────────────────────┘
```

## 📊 Mapeamento de Tipos

| Tipo TabuladorMax | Tipo Gestão Scouter | Notas |
|-------------------|---------------------|-------|
| `text` | `TEXT` | Direto |
| `character varying` | `TEXT` | Convertido para TEXT |
| `integer` | `INTEGER` | Direto |
| `bigint` | `BIGINT` | Direto |
| `smallint` | `SMALLINT` | Direto |
| `boolean` | `BOOLEAN` | Direto |
| `numeric` | `NUMERIC` | Preserva precisão |
| `decimal` | `NUMERIC` | Convertido |
| `real` | `REAL` | Direto |
| `double precision` | `DOUBLE PRECISION` | Direto |
| `timestamp with time zone` | `TIMESTAMPTZ` | Direto |
| `timestamp without time zone` | `TIMESTAMP` | Direto |
| `date` | `DATE` | Direto |
| `time` | `TIME` | Direto |
| `uuid` | `UUID` | Direto |
| `jsonb` | `JSONB` | Direto |
| `json` | `JSONB` | Convertido para JSONB |
| `bytea` | `BYTEA` | Direto |

## 🛡️ Segurança e Proteções

### O que o Auto-Sync FAZ:
✅ Adiciona colunas faltantes  
✅ Cria índices para otimização  
✅ Recarrega schema cache  
✅ Preserva dados existentes  
✅ Usa `IF NOT EXISTS` (idempotente)  

### O que o Auto-Sync NÃO FAZ:
❌ NUNCA remove colunas existentes  
❌ NUNCA altera tipos de colunas existentes  
❌ NUNCA modifica dados  
❌ NUNCA altera constraints existentes  
❌ NUNCA executa DROP ou TRUNCATE  

### Validações Implementadas:

1. **Credenciais:** Verifica se todas as credenciais estão configuradas
2. **Conexão:** Testa conexão com ambos os projetos
3. **Tipos:** Apenas adiciona colunas com tipos suportados
4. **Idempotência:** Pode ser executado múltiplas vezes sem erro
5. **Logs:** Registra todas as operações para auditoria

## 🐛 Troubleshooting

### Erro: "Credenciais do TabuladorMax não configuradas"

**Causa:** Secrets `TABULADOR_URL` ou `TABULADOR_SERVICE_KEY` não estão definidos.

**Solução:**
1. Acesse o painel de configurações
2. Adicione os secrets necessários
3. Tente novamente

### Erro: "Erro ao ler schema do TabuladorMax"

**Causa:** Problema de conexão ou permissão no TabuladorMax.

**Solução:**
1. Verifique se a URL está correta
2. Verifique se a Service Key tem permissão
3. Teste a conexão manualmente

### Erro: "Tipo não suportado"

**Causa:** TabuladorMax possui colunas com tipos personalizados ou enums.

**Solução:**
1. Verifique os logs para ver qual tipo não é suportado
2. Adicione o tipo no mapeamento da edge function
3. Ou crie a coluna manualmente no SQL Editor

### Sincronização não reflete imediatamente

**Causa:** Schema cache do PostgREST ainda não foi atualizado.

**Solução:**
1. Aguarde 10-30 segundos
2. Execute `NOTIFY pgrst, 'reload schema';` manualmente
3. Ou clique em "Diagnóstico RLS" para forçar reload

## 📈 Resultados Esperados

### Antes do Auto-Sync:
```
TabuladorMax: 55 colunas
Gestão Scouter: 49 colunas
❌ Erro: 6 campos faltando
❌ Sincronização falhando
```

### Depois do Auto-Sync:
```
TabuladorMax: 55 colunas
Gestão Scouter: 55 colunas ✅
✅ Schema 100% compatível
✅ Sincronização funcionando
✅ Zero erros PGRST204
```

## 🎯 Quando Usar

### Use Auto-Sync quando:
- TabuladorMax adicionou novos campos
- Aparecem erros de "coluna não encontrada"
- Após atualização no TabuladorMax
- Sincronização começou a falhar
- Você quer garantir compatibilidade

### NÃO precisa usar quando:
- Sincronização está funcionando perfeitamente
- Não há erros de schema
- Você acabou de configurar o sistema pela primeira vez

## 📋 Checklist de Verificação

Após executar o Auto-Sync, verifique:

- [ ] Toast de sucesso apareceu
- [ ] Colunas foram adicionadas (veja detalhes no toast)
- [ ] Índices foram criados
- [ ] Nenhum erro foi reportado
- [ ] Execute "Diagnóstico RLS" para confirmar
- [ ] Teste sincronização de dados do TabuladorMax
- [ ] Verifique se dados aparecem corretamente

## 🔗 Arquivos Relacionados

- **Edge Function:** `supabase/functions/sync-schema-from-tabulador/index.ts`
- **UI Component:** `src/components/dashboard/integrations/TabuladorSync.tsx`
- **Configuração:** `supabase/config.toml`
- **Arquitetura:** `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md`
- **Diagnóstico:** `docs/DIAGNOSTICO_RLS.md`

## 💡 Dicas

1. **Execute periodicamente:** Faça Auto-Sync após cada atualização no TabuladorMax
2. **Verifique logs:** Sempre confira os logs da edge function para detalhes
3. **Dry-run disponível:** Você pode chamar a edge function com `dry_run: true` para apenas ver o que seria feito
4. **Índices automáticos:** O sistema cria índices apenas para colunas que precisam
5. **Idempotente:** Seguro executar múltiplas vezes

## 📞 Suporte

Se o Auto-Sync não resolver seu problema:

1. Execute "Diagnóstico RLS" para análise detalhada
2. Confira os logs da edge function no console
3. Verifique se as credenciais estão corretas
4. Consulte `SYNC_ARCHITECTURE_GESTAO_SCOUTER.md`
5. Consulte `docs/DIAGNOSTICO_RLS.md`

---

**Última atualização:** 2025-10-21  
**Status:** ✅ Implementado e funcional
