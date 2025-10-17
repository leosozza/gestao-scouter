# Configuração da Tabela gestao_scouter_config no TabuladorMax

## 📋 Visão Geral

Este documento fornece instruções detalhadas para criar a tabela `gestao_scouter_config` no Supabase do **TabuladorMax** (Project ID: `gkvvtfqfggddzotxltxf`). Esta tabela é necessária para eliminar o erro 404 que ocorre ao salvar as configurações de integração.

## 🎯 Objetivo

A tabela `gestao_scouter_config` armazena as configurações de conexão do Gestão Scouter, permitindo que o TabuladorMax se comunique de volta com o Gestão Scouter para sincronização bidirecional de dados.

### Por que esta tabela é necessária?

Atualmente, a função de trigger `sync_lead_to_fichas()` no TabuladorMax usa configurações de banco de dados (`current_setting('app.gestao_scouter_url', true)`), que:
- São difíceis de gerenciar
- Não têm versionamento
- Não podem ser facilmente auditadas
- Retornam erro 404 quando não configuradas

A tabela `gestao_scouter_config` resolve esses problemas fornecendo:
- ✅ Armazenamento estruturado de configurações
- ✅ Versionamento através de `created_at` e `updated_at`
- ✅ Controle de acesso via RLS (Row Level Security)
- ✅ Histórico de mudanças
- ✅ Facilidade de gerenciamento via SQL ou API

## 📁 Arquivos Relacionados

- **Migration SQL**: `supabase/migrations/tabuladormax_gestao_scouter_config.sql`
- **Trigger Function**: `supabase/functions/trigger_sync_leads_to_fichas.sql`

## 🚀 Passo a Passo de Instalação

### Pré-requisitos

Antes de começar, você precisa ter:

1. **Acesso ao Supabase do TabuladorMax**
   - URL: https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf
   - Permissões de administrador no projeto

2. **Credenciais do Gestão Scouter**
   - Project URL: `https://ngestyxtopvfeyenyvgt.supabase.co`
   - Anon Key (Publishable Key) do projeto Gestão Scouter

### Passo 1: Obter Credenciais do Gestão Scouter

1. Acesse o dashboard do Gestão Scouter:
   ```
   https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt/settings/api
   ```

2. Anote as seguintes informações:
   - **Project URL**: Deve ser algo como `https://ngestyxtopvfeyenyvgt.supabase.co`
   - **anon/public key**: Chave pública que começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Passo 2: Executar o Script SQL

1. Acesse o SQL Editor do TabuladorMax:
   ```
   https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf/sql/new
   ```

2. Abra o arquivo de migração:
   ```
   supabase/migrations/tabuladormax_gestao_scouter_config.sql
   ```

3. Copie **TODO** o conteúdo do arquivo

4. **IMPORTANTE**: Antes de executar, localize esta seção no final do arquivo:
   ```sql
   INSERT INTO public.gestao_scouter_config (project_url, anon_key, active, sync_enabled)
   VALUES (
     'https://ngestyxtopvfeyenyvgt.supabase.co',  -- Substitua pela URL real
     'sua_anon_key_aqui',  -- Substitua pela anon key real
     true,
     false
   )
   ```

5. Substitua `'sua_anon_key_aqui'` pela anon key real do Gestão Scouter (obtida no Passo 1)

6. Cole o SQL modificado no SQL Editor do TabuladorMax

7. Clique em **"Run"** ou pressione `Ctrl+Enter` para executar

### Passo 3: Verificar a Instalação

Execute as seguintes queries no SQL Editor do TabuladorMax para verificar se tudo foi instalado corretamente:

#### 3.1. Verificar se a tabela foi criada
```sql
SELECT tablename, tableowner 
FROM pg_tables 
WHERE tablename = 'gestao_scouter_config';
```
✅ **Resultado esperado**: Deve retornar 1 linha mostrando a tabela `gestao_scouter_config`

#### 3.2. Verificar se o RLS está habilitado
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'gestao_scouter_config';
```
✅ **Resultado esperado**: `rowsecurity` deve ser `true`

#### 3.3. Verificar as policies RLS
```sql
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'gestao_scouter_config'
ORDER BY policyname;
```
✅ **Resultado esperado**: Deve retornar 4 policies (SELECT, INSERT, UPDATE, DELETE)

#### 3.4. Verificar os dados inseridos
```sql
SELECT 
  id, 
  project_url, 
  LEFT(anon_key, 20) || '...' as anon_key_preview,
  active, 
  sync_enabled,
  created_at,
  updated_at
FROM public.gestao_scouter_config;
```
✅ **Resultado esperado**: Deve retornar 1 linha com:
- `project_url`: URL do Gestão Scouter
- `anon_key_preview`: Primeiros 20 caracteres da chave
- `active`: true
- `sync_enabled`: false
- Timestamps preenchidos

### Passo 4: Testar Permissões (Opcional mas Recomendado)

Execute os seguintes testes para garantir que as permissões RLS estão funcionando:

#### Teste 1: SELECT deve funcionar
```sql
SELECT id, active FROM public.gestao_scouter_config;
```
✅ Deve retornar os dados

#### Teste 2: INSERT deve funcionar para autenticados
```sql
INSERT INTO public.gestao_scouter_config (project_url, anon_key, active, sync_enabled)
VALUES ('https://test.supabase.co', 'test_key', false, false)
RETURNING id;
```
✅ Deve inserir um novo registro (você pode deletá-lo depois)

#### Teste 3: UPDATE deve funcionar
```sql
UPDATE public.gestao_scouter_config
SET sync_enabled = true
WHERE active = true
RETURNING id, sync_enabled;
```
✅ Deve atualizar o registro

## 🔧 Estrutura da Tabela

### Colunas

| Coluna | Tipo | Default | Nullable | Descrição |
|--------|------|---------|----------|-----------|
| `id` | serial | auto | NO | Identificador único da configuração |
| `project_url` | text | - | NO | URL do projeto Supabase do Gestão Scouter |
| `anon_key` | text | - | NO | Chave pública (anon key) do Gestão Scouter |
| `active` | boolean | true | NO | Indica se esta configuração está ativa |
| `sync_enabled` | boolean | false | NO | Indica se a sincronização automática está habilitada |
| `created_at` | timestamptz | now() | NO | Data/hora de criação do registro |
| `updated_at` | timestamptz | now() | NO | Data/hora da última atualização |

### Constraints

- **PRIMARY KEY**: `id`
- **CHECK**: `project_url` deve começar com `http://` ou `https://`
- **UNIQUE**: Apenas um registro pode ter `active = true` por vez

### Triggers

- **trigger_update_gestao_scouter_config_updated_at**: Atualiza automaticamente `updated_at` em toda modificação

## 🔐 Políticas RLS (Row Level Security)

A tabela tem RLS habilitado com as seguintes policies:

1. **SELECT**: Permitido para todos (authenticated, anon, service_role)
2. **INSERT**: Permitido para authenticated e service_role
3. **UPDATE**: Permitido para authenticated e service_role
4. **DELETE**: Permitido para authenticated e service_role

Isso garante que:
- ✅ Qualquer cliente pode LER a configuração
- ✅ Apenas usuários autenticados e service role podem MODIFICAR
- ✅ Dados sensíveis (anon_key) são protegidos por SSL/TLS

## 🔄 Integração com o Trigger Function

Após criar a tabela, você pode atualizar a função `sync_lead_to_fichas()` para usar a tabela ao invés das configurações de banco de dados.

### Código Atualizado (Opcional)

Substitua o início da função `sync_lead_to_fichas()` por:

```sql
CREATE OR REPLACE FUNCTION public.sync_lead_to_fichas()
RETURNS trigger AS $$
DECLARE
  gestao_url text;
  gestao_key text;
  config_record record;
  payload jsonb;
  response http_response;
BEGIN
  -- Buscar configuração ativa da tabela
  SELECT project_url, anon_key INTO config_record
  FROM public.gestao_scouter_config
  WHERE active = true AND sync_enabled = true
  LIMIT 1;
  
  -- Validar se encontrou configuração
  IF config_record IS NULL THEN
    RAISE WARNING 'Nenhuma configuração ativa encontrada na tabela gestao_scouter_config';
    RETURN NEW;
  END IF;
  
  gestao_url := config_record.project_url;
  gestao_key := config_record.anon_key;
  
  -- Validar configurações (adicional)
  IF gestao_url IS NULL OR gestao_key IS NULL THEN
    RAISE WARNING 'Configuração incompleta na tabela gestao_scouter_config';
    RETURN NEW;
  END IF;

  -- ... resto da lógica permanece igual
  -- (continue com o código existente para DELETE, INSERT, UPDATE)
```

> **Nota**: Esta atualização é opcional. O trigger atual continuará funcionando, mas usar a tabela é mais moderno e gerenciável.

## 📊 Gerenciamento da Configuração

### Habilitar Sincronização Automática

```sql
UPDATE public.gestao_scouter_config
SET sync_enabled = true
WHERE active = true;
```

### Desabilitar Sincronização Automática

```sql
UPDATE public.gestao_scouter_config
SET sync_enabled = false
WHERE active = true;
```

### Atualizar Credenciais

```sql
UPDATE public.gestao_scouter_config
SET 
  project_url = 'https://nova-url.supabase.co',
  anon_key = 'nova_anon_key_aqui',
  updated_at = now()
WHERE active = true;
```

### Ver Histórico de Mudanças

```sql
SELECT 
  id,
  active,
  sync_enabled,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 as horas_desde_criacao
FROM public.gestao_scouter_config
ORDER BY created_at DESC;
```

## 🐛 Troubleshooting

### Problema: Erro 404 ao salvar configuração

**Causa**: A tabela `gestao_scouter_config` não existe no TabuladorMax.

**Solução**: Execute o script de migração conforme descrito neste documento.

### Problema: Erro de permissão ao executar o script

**Causa**: Você não tem permissões de administrador no projeto TabuladorMax.

**Solução**: 
1. Peça acesso ao proprietário do projeto
2. Ou peça que o proprietário execute o script para você

### Problema: Erro "relation already exists"

**Causa**: A tabela já foi criada anteriormente.

**Solução**: Isso é normal. Você pode:
1. Ignorar o erro e continuar
2. Ou deletar a tabela e recriar: `DROP TABLE IF EXISTS public.gestao_scouter_config CASCADE;`

### Problema: SELECT retorna vazio

**Causa**: O INSERT não foi executado ou falhou.

**Solução**: Execute manualmente o INSERT:
```sql
INSERT INTO public.gestao_scouter_config (project_url, anon_key, active, sync_enabled)
VALUES (
  'https://ngestyxtopvfeyenyvgt.supabase.co',
  'sua_anon_key_real',
  true,
  false
);
```

### Problema: "permission denied for table gestao_scouter_config"

**Causa**: As policies RLS não estão configuradas corretamente.

**Solução**: Execute novamente a seção de policies do script de migração.

## ✅ Checklist de Validação

Use este checklist para verificar se tudo está funcionando:

- [ ] Tabela `gestao_scouter_config` criada com sucesso
- [ ] RLS está habilitado na tabela
- [ ] 4 policies RLS criadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Trigger `trigger_update_gestao_scouter_config_updated_at` criado
- [ ] Registro inicial inserido com credenciais corretas
- [ ] SELECT retorna os dados corretamente
- [ ] `project_url` está preenchido
- [ ] `anon_key` está preenchido
- [ ] `active` é `true`
- [ ] `sync_enabled` é `false` (inicialmente)
- [ ] Timestamps `created_at` e `updated_at` estão preenchidos

## 🎓 Próximos Passos

Após criar a tabela com sucesso:

1. **Testar integração**: Execute uma sincronização manual para verificar se funciona
2. **Habilitar sync automático**: Se tudo estiver funcionando, habilite `sync_enabled = true`
3. **Atualizar trigger function**: Opcionalmente, atualize a função para usar a tabela
4. **Monitorar logs**: Verifique os logs de sincronização no Supabase
5. **Documentar credenciais**: Guarde as credenciais em um local seguro

## 📚 Referências

- [Documentação Supabase - SQL Editor](https://supabase.com/docs/guides/database/overview#using-the-sql-editor)
- [Documentação Supabase - Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentação PostgreSQL - Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [Guia de Configuração TabuladorMax](./TABULADORMAX_CONFIGURATION_GUIDE.md)

## 🆘 Suporte

Se você encontrar problemas não listados neste documento:

1. Verifique os logs do PostgreSQL no Supabase Dashboard
2. Consulte a documentação oficial do Supabase
3. Revise o código da função `sync_lead_to_fichas()`
4. Abra uma issue no repositório do projeto

---

**Última atualização**: 2025-10-17
**Versão**: 1.0.0
