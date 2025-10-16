# Fonte Única de Verdade: Tabela 'fichas'

## ⚠️ ATENÇÃO DESENVOLVEDORES

Esta aplicação utiliza **EXCLUSIVAMENTE** a tabela `fichas` do Supabase como fonte de dados para leads/fichas.

## 🎯 Fonte Centralizada

### ✅ USE SEMPRE

**Tabela no Supabase:**
- `fichas` - Fonte única e centralizada de todos os leads

**Repositories (camada de acesso a dados):**
- `src/repositories/leadsRepo.ts` - Função `getLeads()`
- `src/repositories/dashboardRepo.ts` - Função `getDashboardData()`
- `src/repositories/fichasRepo.ts` - Função `fetchFichasFromDB()`

**Hooks React:**
- `src/hooks/useFichas.ts` - Hook principal para buscar fichas
- `src/hooks/useLeadsFilters.ts` - Filtros de leads

**Services:**
- `src/services/dashboardQueryService.ts` - Queries dinâmicas do dashboard

### ❌ NÃO USE

**Tabelas legadas/descontinuadas:**
- ~~`leads`~~ - Tabela legacy, não usar
- ~~`bitrix_leads`~~ - Apenas para referência histórica, não usar como fonte

**Serviços descontinuados:**
- ~~`MockDataService`~~ - Apenas para testes locais offline
- ~~Fetch direto de Google Sheets~~ - Descontinuado (causava problemas de CORS)

## 📋 Fluxo de Dados

```
Google Sheets → Edge Function → Tabela 'fichas' → Repository → Hook → Componente
```

1. **Origem**: Google Sheets (planilha de controle)
2. **Sincronização**: Edge Functions do Supabase (sync-fichas)
3. **Armazenamento**: Tabela `fichas` no Supabase
4. **Acesso**: Repositories centralizados
5. **Consumo**: Hooks e componentes React

## 🔧 Como Usar

### Buscar Leads em um Componente

```typescript
import { useQuery } from '@tanstack/react-query';
import { getLeads } from '@/repositories/leadsRepo';

function MeuComponente() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads()
  });
  
  // ou use o hook direto:
  // const { data: fichas } = useFichas();
}
```

### Buscar com Filtros

```typescript
import { getLeads } from '@/repositories/leadsRepo';

const leads = await getLeads({
  dataInicio: '2024-01-01',
  dataFim: '2024-12-31',
  scouter: 'João Silva',
  projeto: 'Campanha 2024'
});
```

### Buscar Dados para Dashboard

```typescript
import { getDashboardData } from '@/repositories/dashboardRepo';

const { data, missingFields } = await getDashboardData({
  start: '2024-01-01',
  end: '2024-12-31',
  scouter: 'Maria Santos',
  projeto: 'Projeto Alpha'
});
```

## 📊 Estrutura da Tabela 'fichas'

```sql
CREATE TABLE public.fichas (
  id text PRIMARY KEY,              -- ID único da ficha
  raw jsonb NOT NULL,               -- Dados brutos (backup)
  scouter text,                     -- Nome do scouter
  projeto text,                     -- Nome do projeto
  criado date,                      -- Data de criação
  valor_ficha numeric(12,2),        -- Valor da ficha
  deleted boolean DEFAULT false,    -- Soft delete
  updated_at timestamptz,           -- Última atualização
  created_at timestamptz            -- Data de inserção
);
```

## 🧪 Dados de Teste

### Para Criar Dados de Teste

**Use o script de migração:**
```bash
npm run migrate:leads
```

**Ou insira diretamente na tabela 'fichas':**
```sql
INSERT INTO public.fichas (id, raw, scouter, projeto, criado, valor_ficha)
VALUES (
  'TEST-001',
  '{"nome": "João Silva", "telefone": "11999999999"}'::jsonb,
  'Scouter Teste',
  'Projeto Teste',
  '2024-01-01',
  150.00
);
```

**Mock Service (apenas desenvolvimento local):**
```typescript
// APENAS para testes offline - não usar em produção!
import { MockDataService } from '@/services/mockDataService';
const testData = await MockDataService.fetchFichas();
```

## 🚀 Migrations

Ao criar novas features ou popular dados de teste:

1. **Sempre popule a tabela 'fichas'**
2. **Use os scripts fornecidos:**
   - `scripts/syncLeadsToFichas.ts` - Migração de dados legados
   - `scripts/testMigration.ts` - Validação e exemplos
3. **Siga a estrutura da migration:**
   - `supabase/migrations/20250929_create_fichas.sql`

## 📝 Checklist para Novos Desenvolvedores

Ao trabalhar com dados de leads/fichas:

- [ ] Estou usando a tabela `fichas`?
- [ ] Estou usando o repository correto (`leadsRepo.ts`)?
- [ ] Estou evitando tabelas legadas (`leads`, `bitrix_leads`)?
- [ ] Não estou usando `MockDataService` em código de produção?
- [ ] Minhas queries incluem `.eq('deleted', false)`?
- [ ] Estou tratando erros adequadamente?

## 🐛 Solução de Problemas

### Problema: "Não encontro dados de leads"
**Solução:** Certifique-se de usar `getLeads()` de `leadsRepo.ts`

### Problema: "Dados desatualizados"
**Solução:** Verifique se a sincronização com Google Sheets está ativa

### Problema: "Erro de CORS ao buscar dados"
**Solução:** Não tente buscar direto do Google Sheets, use a tabela `fichas`

### Problema: "MockDataService em produção"
**Solução:** Remova imports do MockDataService do código de produção

## 📚 Referências

- **Documentação Principal**: README.md
- **Copilot Instructions**: .github/copilot-instructions.md
- **Migration Script**: scripts/syncLeadsToFichas.ts
- **Schema SQL**: supabase/migrations/20250929_create_fichas.sql

## 🔄 Histórico de Mudanças

- **2024-10-16**: Centralização completa na tabela 'fichas'
- **2024-09-29**: Criação da tabela 'fichas' como fonte única
- **2024-09-16**: Migrations iniciais do Supabase
- **2024-08-18**: Tabelas legadas (bitrix_leads)

---

**Última atualização:** 2024-10-16  
**Mantido por:** Equipe Gestão Scouter
