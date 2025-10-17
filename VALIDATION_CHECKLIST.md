# Checklist de Validação - Centralização da Tabela 'fichas'

## 🎯 Objetivo

Validar que toda a aplicação Gestão Scouter usa exclusivamente a tabela `fichas` do Supabase como fonte de dados, sem dependências de fontes alternativas.

## ✅ Checklist de Verificação

### 1. Verificação de Código

#### Queries e Repositories
- [ ] `src/hooks/useFichas.ts` usa `.from('fichas')`
- [ ] `src/repositories/leadsRepo.ts` usa `.from('fichas')`
- [ ] `src/repositories/dashboardRepo.ts` usa `.from('fichas')`
- [ ] `src/repositories/fichasRepo.ts` usa `.from('fichas')`
- [ ] `src/map/fichas/data.ts` usa `.from('fichas')`
- [ ] Nenhum arquivo de produção usa `.from('leads')`
- [ ] Nenhum arquivo de produção usa `.from('bitrix_leads')`

#### Imports e Dependências
- [ ] Nenhum import de `MockDataService` em código de produção
- [ ] Nenhum import direto de Google Sheets em componentes
- [ ] Páginas principais (Leads, Dashboard) importam de repositories corretos
- [ ] Hooks personalizados usam tabela `fichas`

#### Comentários e Alertas
- [ ] `useFichas.ts` contém alerta sobre fonte única
- [ ] `leadsRepo.ts` contém header com avisos importantes
- [ ] `mockDataService.ts` marcado como dev-only
- [ ] `fichasRepo.ts` documentado corretamente
- [ ] `types.ts` explica relação Lead = Ficha

### 2. Verificação de Documentação

#### Documentos Principais
- [ ] `LEADS_DATA_SOURCE.md` existe e está completo
- [ ] `CENTRALIZACAO_FICHAS_SUMMARY.md` existe
- [ ] `README.md` referencia a fonte única
- [ ] `src/map/fichas/README.md` atualizado

#### Conteúdo da Documentação
- [ ] Fluxo de dados explicado claramente
- [ ] Lista do que usar e NÃO usar
- [ ] Exemplos práticos de código fornecidos
- [ ] Checklist para novos desenvolvedores
- [ ] Seção de troubleshooting incluída
- [ ] Estrutura da tabela documentada

### 3. Verificação de Scripts

#### Scripts de Migração
- [ ] `scripts/syncLeadsToFichas.ts` documentado
- [ ] `scripts/testMigration.ts` atualizado
- [ ] `scripts/verify-fichas-centralization.sh` funcional
- [ ] Script de verificação adicionado ao `package.json`

#### Migrations SQL
- [ ] `20250929_create_fichas.sql` com comentários detalhados
- [ ] Índices criados corretamente
- [ ] RLS policies configuradas
- [ ] Trigger de updated_at funcionando

### 4. Verificação de Build

#### Compilação
- [ ] `npm run build` executa sem erros
- [ ] Sem erros TypeScript
- [ ] Sem warnings críticos
- [ ] Bundle size aceitável

#### Runtime
- [ ] Aplicação inicia sem erros no console
- [ ] Queries para `fichas` funcionando
- [ ] Dados carregando corretamente
- [ ] Filtros funcionando

### 5. Verificação de Interfaces

#### Páginas Principais
- [ ] `/leads` - Lista de leads carregando da tabela `fichas`
- [ ] `/dashboard` - Dashboard usando dados de `fichas`
- [ ] `/area-de-abordagem` - Mapas usando dados de `fichas`
- [ ] `/pagamentos` - Pagamentos referenciando `fichas`

#### Componentes Críticos
- [ ] `PerformanceDashboard` busca de `fichas`
- [ ] `LeadsTable` exibe dados de `fichas`
- [ ] `UnifiedMap` usa dados geográficos de `fichas`
- [ ] Filtros aplicam queries em `fichas`

### 6. Verificação de Dados

#### Estrutura da Tabela
- [ ] Campo `id` (text, primary key)
- [ ] Campo `raw` (jsonb, not null)
- [ ] Campo `scouter` (text, indexed)
- [ ] Campo `projeto` (text, indexed)
- [ ] Campo `criado` (date, indexed)
- [ ] Campo `valor_ficha` (numeric)
- [ ] Campo `deleted` (boolean, default false)
- [ ] Campo `updated_at` (timestamptz)
- [ ] Campo `created_at` (timestamptz)

#### Queries Comuns
- [ ] Busca básica: `SELECT * FROM fichas WHERE deleted = false`
- [ ] Filtro por data: `.gte('criado', startDate).lte('criado', endDate)`
- [ ] Filtro por scouter: `.ilike('scouter', '%nome%')`
- [ ] Filtro por projeto: `.eq('projeto', 'nome_projeto')`
- [ ] Ordenação: `.order('criado', { ascending: false })`

### 7. Verificação de Compatibilidade

#### Retrocompatibilidade
- [ ] Tipo `Lead` ainda existe (alias para `Ficha`)
- [ ] Funções legadas ainda funcionam
- [ ] Nenhuma breaking change introduzida
- [ ] Código antigo continua compilando

#### Migrações
- [ ] Dados migrados mantêm integridade
- [ ] Campo `raw` preserva dados originais
- [ ] IDs são únicos e estáveis
- [ ] Timestamps corretos

### 8. Verificação Automatizada

#### Scripts de Verificação
```bash
# Executar verificação completa
npm run verify:fichas

# Build de produção
npm run build

# Verificar migrations
# (executar via Supabase CLI se disponível)
```

#### Resultados Esperados
- [ ] Script de verificação passa (10/10 checks)
- [ ] Build completa em < 30s
- [ ] Sem erros no console
- [ ] Todas as queries usando `fichas`

### 9. Testes Manuais

#### Navegação e UI
1. [ ] Acessar `/leads` e verificar lista de leads
2. [ ] Aplicar filtros e verificar resultados
3. [ ] Acessar `/dashboard` e verificar métricas
4. [ ] Verificar mapas em `/area-de-abordagem`
5. [ ] Testar busca e ordenação

#### DevTools
1. [ ] Abrir Network tab
2. [ ] Verificar requests para Supabase
3. [ ] Confirmar queries para tabela `fichas`
4. [ ] Verificar ausência de queries para `leads` ou `bitrix_leads`
5. [ ] Checar console para warnings

### 10. Validação de Produção

#### Antes do Deploy
- [ ] Todas as verificações acima passaram
- [ ] Documentação revisada e aprovada
- [ ] Scripts de migração testados
- [ ] Build de produção validada

#### Pós-Deploy
- [ ] Aplicação funcionando normalmente
- [ ] Dados carregando de `fichas`
- [ ] Performance mantida
- [ ] Sem erros nos logs

## 🔍 Como Executar a Verificação

### Verificação Automatizada
```bash
# 1. Clonar/atualizar repositório
git pull origin main

# 2. Instalar dependências
npm install

# 3. Executar verificação
npm run verify:fichas

# 4. Executar build
npm run build

# 5. Iniciar dev server e testar manualmente
npm run dev
```

### Verificação Manual
1. Abrir cada arquivo listado na checklist
2. Verificar conteúdo conforme descrito
3. Marcar itens completados
4. Registrar problemas encontrados

## 📊 Critérios de Aceitação

### Mínimo Necessário
- ✅ 100% das queries de produção usando `fichas`
- ✅ 0 queries para tabelas legadas (`leads`, `bitrix_leads`)
- ✅ 0 imports de `MockDataService` em produção
- ✅ Build sem erros
- ✅ Documentação completa

### Desejável
- ✅ Script de verificação passando (10/10)
- ✅ Todos os comentários de alerta presentes
- ✅ Todas as páginas testadas manualmente
- ✅ Performance mantida ou melhorada

## 🐛 Resolução de Problemas

### Se a verificação falhar:

#### Query para tabela legada encontrada
```bash
# Encontrar e corrigir
grep -r "\.from('leads')" src --include="*.ts" --include="*.tsx"
# Substituir por .from('fichas')
```

#### Import de MockDataService em produção
```bash
# Encontrar imports
grep -r "import.*MockDataService" src --include="*.ts" --include="*.tsx"
# Remover ou usar repository correto
```

#### Build falhando
```bash
# Ver erros detalhados
npm run build 2>&1 | tee build.log
# Corrigir erros TypeScript apontados
```

#### Documentação faltando
```bash
# Verificar existência
ls -la LEADS_DATA_SOURCE.md
ls -la CENTRALIZACAO_FICHAS_SUMMARY.md
# Criar se necessário usando os templates
```

## 📝 Registro de Validação

**Data da Validação**: _________________

**Responsável**: _________________

**Versão do Código**: _________________

**Resultado**: [ ] PASSOU  [ ] FALHOU  [ ] PARCIAL

**Observações**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Assinatura**: _________________

---

**Última atualização**: 2024-10-16  
**Versão**: 1.0.0
