# Arquitetura da Tabela gestao_scouter_config

## 📊 Diagrama de Arquitetura

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE TABULADORMAX                             │
│                     (Project: gkvvtfqfggddzotxltxf)                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              Tabela: gestao_scouter_config                     │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │ id              serial PRIMARY KEY                             │    │
│  │ project_url     text NOT NULL    ← URL do Gestão Scouter       │    │
│  │ anon_key        text NOT NULL    ← Anon key do Gestão Scouter  │    │
│  │ active          boolean DEFAULT true                           │    │
│  │ sync_enabled    boolean DEFAULT false                          │    │
│  │ created_at      timestamptz DEFAULT now()                      │    │
│  │ updated_at      timestamptz DEFAULT now()                      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                             │                                            │
│                             │ Usado por:                                 │
│                             ▼                                            │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │         Função: sync_lead_to_fichas()                          │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │  SELECT project_url, anon_key                                  │    │
│  │  FROM gestao_scouter_config                                    │    │
│  │  WHERE active = true AND sync_enabled = true                   │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                             │                                            │
│                             │ Faz requisições para:                      │
│                             ▼                                            │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST/PUT/DELETE
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE GESTÃO SCOUTER                           │
│                     (Project: ngestyxtopvfeyenyvgt)                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                   Tabela: fichas                               │    │
│  ├────────────────────────────────────────────────────────────────┤    │
│  │  Recebe sincronização de leads do TabuladorMax                │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Sincronização

### 1. Configuração Inicial

```
┌─────────────┐
│   Admin     │
└──────┬──────┘
       │ 1. Acessa SQL Editor
       │    do TabuladorMax
       ▼
┌─────────────────────────────┐
│  Execute Migration SQL      │
│  tabuladormax_gestao_       │
│  scouter_config.sql         │
└──────────────┬──────────────┘
               │ 2. Cria tabela e insere config
               ▼
┌──────────────────────────────────────┐
│  gestao_scouter_config               │
│  ┌────────────────────────────────┐  │
│  │ project_url = https://...      │  │
│  │ anon_key = eyJhbGciOiJI...     │  │
│  │ active = true                  │  │
│  │ sync_enabled = false           │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 2. Operação Normal

```
┌──────────────────────────────────────────────────────────────┐
│                    TABULADORMAX                              │
│                                                              │
│  Evento: INSERT/UPDATE/DELETE na tabela leads               │
│                      │                                       │
│                      ▼                                       │
│         ┌─────────────────────────────┐                     │
│         │  Trigger: sync_lead_to_     │                     │
│         │          fichas()           │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                     │
│                        │ 1. Query config                     │
│                        ▼                                     │
│         ┌─────────────────────────────┐                     │
│         │  SELECT FROM                │                     │
│         │  gestao_scouter_config      │                     │
│         │  WHERE active = true        │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                     │
│                        │ 2. Retorna config                   │
│                        ▼                                     │
│         ┌─────────────────────────────┐                     │
│         │  gestao_url = project_url   │                     │
│         │  gestao_key = anon_key      │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                     │
└────────────────────────┼─────────────────────────────────────┘
                         │ 3. HTTP Request
                         │    (POST/PUT/DELETE)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  GESTÃO SCOUTER                              │
│                                                              │
│         ┌─────────────────────────────┐                     │
│         │  Supabase REST API          │                     │
│         │  /rest/v1/fichas            │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                     │
│                        ▼                                     │
│         ┌─────────────────────────────┐                     │
│         │  Tabela: fichas             │                     │
│         │  ┌────────────────────────┐ │                     │
│         │  │ Dados sincronizados    │ │                     │
│         │  └────────────────────────┘ │                     │
│         └─────────────────────────────┘                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 🔐 Segurança e Permissões

### RLS Policies

```
┌─────────────────────────────────────────────────────────────┐
│              gestao_scouter_config                          │
│              RLS: ENABLED ✅                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📖 SELECT Policy: "Permitir SELECT para todos"             │
│     ├─ authenticated  ✅                                     │
│     ├─ anon          ✅                                     │
│     └─ service_role  ✅                                     │
│                                                             │
│  ➕ INSERT Policy: "Permitir INSERT para autenticados"      │
│     ├─ authenticated  ✅                                     │
│     ├─ anon          ❌                                     │
│     └─ service_role  ✅                                     │
│                                                             │
│  ✏️  UPDATE Policy: "Permitir UPDATE para autenticados"     │
│     ├─ authenticated  ✅                                     │
│     ├─ anon          ❌                                     │
│     └─ service_role  ✅                                     │
│                                                             │
│  🗑️  DELETE Policy: "Permitir DELETE para autenticados"     │
│     ├─ authenticated  ✅                                     │
│     ├─ anon          ❌                                     │
│     └─ service_role  ✅                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Autenticação

```
Leitura de Config (Trigger Function)
     │
     ├─ Usa: service_role credentials (do TabuladorMax)
     ├─ Policy: SELECT permitido ✅
     └─ Retorna: project_url + anon_key
     
Chamada HTTP ao Gestão Scouter
     │
     ├─ Usa: anon_key do Gestão Scouter (da config)
     ├─ Endpoint: /rest/v1/fichas
     └─ Autentica: Bearer token com anon_key
```

## 📋 Estrutura de Dados

### Exemplo de Registro

```json
{
  "id": 1,
  "project_url": "https://ngestyxtopvfeyenyvgt.supabase.co",
  "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "active": true,
  "sync_enabled": true,
  "created_at": "2025-10-17T18:00:00.000Z",
  "updated_at": "2025-10-17T19:30:00.000Z"
}
```

### Validações

```
┌─────────────────────────────────────────────────────────────┐
│                      Constraints                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ PRIMARY KEY: id                                         │
│     - Único identificador                                   │
│     - Auto-incremento (serial)                              │
│                                                             │
│  ✅ CHECK: valid_project_url                                │
│     - project_url ~ '^https?://'                           │
│     - Deve começar com http:// ou https://                 │
│                                                             │
│  ✅ UNIQUE: unique_active_config                            │
│     - Apenas um registro pode ter active = true            │
│     - Garante uma única configuração ativa                 │
│                                                             │
│  ✅ NOT NULL: project_url, anon_key                         │
│     - Campos obrigatórios                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Triggers

```
┌─────────────────────────────────────────────────────────────┐
│            Trigger: Update Timestamp                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Evento: BEFORE UPDATE                                      │
│  Função: update_gestao_scouter_config_updated_at()          │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  UPDATE gestao_scouter_config                   │       │
│  │  SET sync_enabled = true                        │       │
│  │  WHERE id = 1;                                  │       │
│  └────────────────┬────────────────────────────────┘       │
│                   │                                         │
│                   ▼                                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Trigger Automático                             │       │
│  │  NEW.updated_at = now()                         │       │
│  └────────────────┬────────────────────────────────┘       │
│                   │                                         │
│                   ▼                                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Registro atualizado com novo timestamp         │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Estados de Sincronização

### Estado 1: Configuração Inativa

```
┌────────────────────────────────┐
│  gestao_scouter_config         │
│  ┌──────────────────────────┐  │
│  │ active = true            │  │
│  │ sync_enabled = false  ⏸️ │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
         │
         │ Comportamento:
         ├─ Config existe ✅
         ├─ Pode ser lida ✅
         └─ Sync desabilitado ⏸️
```

### Estado 2: Configuração Ativa e Sincronizando

```
┌────────────────────────────────┐
│  gestao_scouter_config         │
│  ┌──────────────────────────┐  │
│  │ active = true            │  │
│  │ sync_enabled = true   ✅ │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
         │
         │ Comportamento:
         ├─ Config existe ✅
         ├─ Pode ser lida ✅
         └─ Sync habilitado ✅
         
         ▼
┌──────────────────────────────────────┐
│  Trigger sync_lead_to_fichas()       │
│  ├─ Busca config ✅                   │
│  ├─ Valida config ✅                  │
│  └─ Executa sincronização ✅          │
└──────────────────────────────────────┘
```

### Estado 3: Múltiplas Configurações (Apenas uma ativa)

```
┌────────────────────────────────┐
│  Registro 1                    │
│  ┌──────────────────────────┐  │
│  │ active = true         ✅ │  │
│  │ sync_enabled = true      │  │
│  │ project_url = prod       │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
         │ Única config ativa
         │
┌────────────────────────────────┐
│  Registro 2                    │
│  ┌──────────────────────────┐  │
│  │ active = false        ❌ │  │
│  │ sync_enabled = false     │  │
│  │ project_url = staging    │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
         │ Config inativa (backup)
         │
┌────────────────────────────────┐
│  Registro 3                    │
│  ┌──────────────────────────┐  │
│  │ active = false        ❌ │  │
│  │ sync_enabled = false     │  │
│  │ project_url = dev        │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
         │ Config inativa (dev)
```

## 📈 Operações Comuns

### 1. Consultar Configuração Ativa

```sql
-- Usado pela função sync_lead_to_fichas()
SELECT project_url, anon_key
FROM public.gestao_scouter_config
WHERE active = true AND sync_enabled = true
LIMIT 1;
```

### 2. Habilitar Sincronização

```sql
UPDATE public.gestao_scouter_config
SET sync_enabled = true
WHERE active = true;
```

### 3. Trocar Configuração Ativa

```sql
-- Desativar todas
UPDATE public.gestao_scouter_config
SET active = false;

-- Ativar uma específica
UPDATE public.gestao_scouter_config
SET active = true
WHERE id = 2;
```

### 4. Criar Nova Configuração de Backup

```sql
INSERT INTO public.gestao_scouter_config 
  (project_url, anon_key, active, sync_enabled)
VALUES 
  ('https://staging.supabase.co', 'staging_key', false, false);
```

## 🎯 Pontos Importantes

1. **Apenas uma config ativa**: Constraint garante `UNIQUE (active) WHERE active = true`
2. **Timestamps automáticos**: `updated_at` é atualizado por trigger
3. **RLS habilitado**: Acesso controlado por policies
4. **Validação de URL**: Check constraint valida formato da URL
5. **Campos obrigatórios**: `project_url` e `anon_key` são NOT NULL

## 📚 Referências

- [SQL Migration](./supabase/migrations/tabuladormax_gestao_scouter_config.sql)
- [Setup Completo](./TABULADORMAX_CONFIG_TABLE_SETUP.md)
- [Quick Setup](./QUICK_SETUP_GESTAO_SCOUTER_CONFIG.md)
- [Trigger Function](./supabase/functions/trigger_sync_leads_to_fichas.sql)

---

**Última atualização**: 2025-10-17
**Versão**: 1.0.0
