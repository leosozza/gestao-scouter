# Supabase Migrations Guide

Este documento descreve como aplicar e gerenciar as migrations do banco de dados Supabase para o projeto Gestão Scouter.

## Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Aplicando Migrations](#aplicando-migrations)
- [Migration de Geolocalização](#migration-de-geolocalização)
- [Verificação e Testes](#verificação-e-testes)
- [Troubleshooting](#troubleshooting)

## Visão Geral

As migrations do Supabase são arquivos SQL versionados localizados no diretório `supabase/migrations/`. Cada migration é nomeada com um timestamp e deve ser idempotente (pode ser aplicada múltiplas vezes sem causar erros).

## Pré-requisitos

### Instalar Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Ou via NPM:
```bash
npm install -g supabase
```

### Configurar Credenciais

1. Obtenha suas credenciais do Supabase:
   - Project ID: Visível no dashboard do Supabase
   - Database URL: `Settings > Database > Connection string`
   - Service Role Key: `Settings > API > service_role key`

2. Configure as variáveis de ambiente:
```bash
export SUPABASE_PROJECT_ID="seu-project-id"
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

## Aplicando Migrations

### Via Supabase CLI (Recomendado)

#### Opção 1: Link ao projeto existente

```bash
# Na raiz do projeto
cd /path/to/gestao-scouter

# Fazer login
supabase login

# Linkar ao projeto remoto
supabase link --project-ref seu-project-ref

# Aplicar todas as migrations pendentes
supabase db push
```

#### Opção 2: Aplicar migration específica

```bash
# Aplicar apenas a migration de geolocalização
supabase db push --file supabase/migrations/20251001_geo_ingest.sql
```

### Via psql (Direto no banco)

Se você não pode usar o CLI do Supabase, pode aplicar migrations diretamente:

```bash
# Conectar ao banco
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Aplicar migration
\i supabase/migrations/20251001_geo_ingest.sql

# Ou via comando direto
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20251001_geo_ingest.sql
```

### Via Supabase Dashboard (SQL Editor)

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Navegue até: `SQL Editor`
3. Clique em `New Query`
4. Copie o conteúdo da migration: `supabase/migrations/20251001_geo_ingest.sql`
5. Cole no editor e execute (Run)

## Migration de Geolocalização

A migration `20251001_geo_ingest.sql` cria a infraestrutura completa para funcionalidades de geolocalização.

### O que esta migration cria:

#### Tabelas
- `public.scouters` - Tabela normalizada de scouters
- `public.scouter_locations` - Histórico de localizações dos scouters
- `public.geocache` - Cache de geocodificação

#### Views
- `public.scouter_last_location` - Última localização de cada scouter (singular)
- `public.scouters_last_locations` - Alias plural para compatibilidade

#### Materialized View
- `public.fichas_geo` - View materializada de fichas com geolocalização

#### Funções RPC
- `get_scouters_last_locations()` - Retorna últimas localizações dos scouters
- `get_fichas_geo(p_start, p_end, p_project, p_scouter)` - Retorna fichas/leads georreferenciadas

#### Índices
- Índices geoespaciais em `scouter_locations`
- Índices em `fichas.lat/lng` e `leads.latitude/longitude`
- Índices na materialized view `fichas_geo`

#### RLS Policies
- Políticas de leitura para usuários autenticados
- Políticas de inserção para `scouter_locations`

### Aplicando a Migration de Geolocalização

```bash
# Via Supabase CLI
supabase db push --file supabase/migrations/20251001_geo_ingest.sql

# Via psql
psql "$DATABASE_URL" -f supabase/migrations/20251001_geo_ingest.sql

# Verificar que foi aplicada com sucesso
psql "$DATABASE_URL" -c "SELECT * FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('scouters', 'scouter_locations', 'geocache');"
```

### Manutenção da Materialized View

A materialized view `fichas_geo` precisa ser atualizada periodicamente:

```sql
-- Atualizar sem bloquear leituras (recomendado)
REFRESH MATERIALIZED VIEW CONCURRENTLY public.fichas_geo;

-- Atualizar com bloqueio (mais rápido)
REFRESH MATERIALIZED VIEW public.fichas_geo;
```

**Recomendação**: Configure um cron job ou Edge Function para atualizar a cada hora:

```bash
# Exemplo de cron job (executar a cada hora)
0 * * * * psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY public.fichas_geo;"
```

## Verificação e Testes

### Verificar Tabelas Criadas

```sql
-- Listar todas as tabelas de geolocalização
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('scouters', 'scouter_locations', 'geocache');

-- Verificar estrutura das tabelas
\d public.scouters
\d public.scouter_locations
\d public.geocache
```

### Verificar Views

```sql
-- Listar views criadas
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE '%scouter%';

-- Verificar materialized view
SELECT schemaname, matviewname 
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname = 'fichas_geo';
```

### Verificar Índices

```sql
-- Listar índices geoespaciais
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%scouter%' OR tablename LIKE '%fichas%' OR tablename LIKE '%leads%')
  AND (indexname LIKE '%lat%' OR indexname LIKE '%lng%' OR indexname LIKE '%geo%')
ORDER BY tablename, indexname;
```

### Verificar Funções RPC

```sql
-- Listar funções criadas
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_scouters_last_locations', 'get_fichas_geo');

-- Testar RPC get_scouters_last_locations
SELECT * FROM public.get_scouters_last_locations() LIMIT 5;

-- Testar RPC get_fichas_geo
SELECT * FROM public.get_fichas_geo(
  '2024-01-01'::date,
  CURRENT_DATE,
  NULL,
  NULL
) LIMIT 5;
```

### Executar Suite de Testes

Execute o arquivo de testes SQL:

```bash
# Via psql
psql "$DATABASE_URL" -f supabase/tests/validate_rpc.sql

# Via Supabase CLI
supabase test db --file supabase/tests/validate_rpc.sql
```

### Verificar RLS Policies

```sql
-- Listar políticas RLS criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('scouters', 'scouter_locations', 'geocache')
ORDER BY tablename, policyname;
```

## Troubleshooting

### Erro: "relation already exists"

Este erro é esperado em re-aplicações da migration devido à idempotência. Use:
```sql
CREATE TABLE IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
```

### Erro: "column already exists"

A migration já tem proteções para este caso. Verifique se está usando a versão mais recente.

### Erro: "permission denied"

Certifique-se de estar usando a `service_role` key, não a `anon` key:
```bash
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

### Erro: "function does not exist"

Verifique se a migration foi aplicada completamente:
```sql
-- Listar funções
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%geo%';
```

### Performance Issues com Materialized View

Se a materialized view está causando lentidão:

```sql
-- Verificar tamanho da view
SELECT 
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews 
WHERE schemaname = 'public' AND matviewname = 'fichas_geo';

-- Recriar índices
REINDEX MATERIALIZED VIEW public.fichas_geo;

-- Atualizar estatísticas
ANALYZE public.fichas_geo;
```

### Reverter Migration

Se necessário reverter a migration de geolocalização:

```sql
-- ATENÇÃO: Isso deletará dados permanentemente!

-- Dropar funções RPC
DROP FUNCTION IF EXISTS public.get_scouters_last_locations() CASCADE;
DROP FUNCTION IF EXISTS public.get_fichas_geo(date, date, text, text) CASCADE;

-- Dropar views
DROP MATERIALIZED VIEW IF EXISTS public.fichas_geo CASCADE;
DROP VIEW IF EXISTS public.scouters_last_locations CASCADE;
DROP VIEW IF EXISTS public.scouter_last_location CASCADE;

-- Dropar índices (opcional - podem ser úteis)
-- DROP INDEX IF EXISTS public.idx_fichas_latlng;
-- DROP INDEX IF EXISTS public.idx_leads_latlng;

-- Dropar tabelas
DROP TABLE IF EXISTS public.scouter_locations CASCADE;
DROP TABLE IF EXISTS public.scouters CASCADE;
DROP TABLE IF EXISTS public.geocache CASCADE;

-- Remover colunas de geo (CUIDADO!)
-- ALTER TABLE public.fichas DROP COLUMN IF EXISTS lat, DROP COLUMN IF EXISTS lng;
-- ALTER TABLE public.leads DROP COLUMN IF EXISTS latitude, DROP COLUMN IF EXISTS longitude;
```

## Recursos Adicionais

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do Supabase: `Settings > Logs`
2. Consulte a documentação do projeto: `/docs`
3. Abra uma issue no repositório: GitHub Issues
