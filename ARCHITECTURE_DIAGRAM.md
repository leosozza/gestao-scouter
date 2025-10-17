# Sistema de Configuração e Logs do TabuladorMax - Diagrama de Arquitetura

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + TypeScript)                 │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Configurações Page                          │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │   Usuários   │  │  Permissões  │  │  Integrações │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  │                                         │                      │  │
│  │                    ┌────────────────────┴───────────────┐     │  │
│  │                    │                                     │     │  │
│  │  ┌─────────────────▼─────────────────────────────────────┐   │  │
│  │  │         IntegrationsPanel (5 tabs)                     │   │  │
│  │  │  ┌──────┬──────┬──────┬──────┬──────┐                 │   │  │
│  │  │  │Config│ Sync │ Logs │Import│Webhks│                 │   │  │
│  │  │  └──┬───┴──┬───┴──┬───┴──────┴──────┘                 │   │  │
│  │  └─────┼──────┼──────┼──────────────────────────────────┘   │  │
│  └────────┼──────┼──────┼──────────────────────────────────────┘  │
│           │      │      │                                          │
│  ┌────────▼──────┴──────┴──────────────────────────────────────┐  │
│  │                    Components Layer                          │  │
│  │                                                              │  │
│  │  ┌──────────────────────┐  ┌───────────────────────────┐   │  │
│  │  │TabuladorMaxConfig    │  │  SyncLogsViewer           │   │  │
│  │  │Panel                 │  │  - Table view             │   │  │
│  │  │- Form fields         │  │  - Expandable details     │   │  │
│  │  │- Test connection     │  │  - Auto-refresh           │   │  │
│  │  │- Save config         │  │  - Clear logs             │   │  │
│  │  └──────────┬───────────┘  └───────────┬───────────────┘   │  │
│  │             │                           │                   │  │
│  │  ┌──────────▼───────────────────────────▼───────────────┐  │  │
│  │  │           TabuladorSync                               │  │  │
│  │  │  - Migration button (with logging)                    │  │  │
│  │  │  - Sync button (with logging)                         │  │  │
│  │  │  - Test connection button                             │  │  │
│  │  └──────────┬────────────────────────────────────────────┘  │  │
│  │             │                                                │  │
│  │  ┌──────────▼────────────────────────────────────────────┐  │  │
│  │  │              UsersPanel (Fixed)                        │  │  │
│  │  │  - Create user with immediate refresh                 │  │  │
│  │  │  - Detailed logging                                    │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Repositories Layer                         │  │
│  │                                                               │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐ │  │
│  │  │tabuladorConfig   │  │    syncLogsRepo                   │ │  │
│  │  │Repo              │  │    - createSyncLog()              │ │  │
│  │  │- getTabulador    │  │    - getSyncLogs()                │ │  │
│  │  │  Config()        │  │    - clearSyncLogs()              │ │  │
│  │  │- saveTabulador   │  │    - localStorage fallback        │ │  │
│  │  │  Config()        │  │                                   │ │  │
│  │  │- testTabulador   │  │                                   │ │  │
│  │  │  Connection()    │  │                                   │ │  │
│  │  └────────┬─────────┘  └────────┬──────────────────────────┘ │  │
│  └───────────┼──────────────────────┼────────────────────────────┘  │
│              │                      │                                │
│  ┌───────────▼──────────────────────▼─────────────────────────────┐ │
│  │                     Storage Layer                               │ │
│  │                                                                 │ │
│  │  ┌─────────────────────┐        ┌──────────────────────────┐  │ │
│  │  │  localStorage       │        │  Supabase (Gestão)       │  │ │
│  │  │  - tabuladormax_   │        │  - tabulador_config      │  │ │
│  │  │    config           │        │    (optional table)       │  │ │
│  │  │  - sync_logs_      │        │  - sync_logs_detailed    │  │ │
│  │  │    detailed         │        │    (optional table)       │  │ │
│  │  └─────────────────────┘        └──────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

                                    ▼

┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase Edge Functions)                 │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  test-tabulador-connection                                    │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Check environment variables                          │  │   │
│  │  │ 2. Create TabuladorMax client with headers              │  │   │
│  │  │ 3. Test query on 'leads' table                          │  │   │
│  │  │ 4. List available tables                                │  │   │
│  │  │ 5. Test alternative table names                         │  │   │
│  │  │ 6. Return diagnostics with troubleshooting              │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  initial-sync-leads                                           │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Create clients (Gestão + TabuladorMax)              │  │   │
│  │  │ 2. Fetch ALL leads in pages (1000 per page)            │  │   │
│  │  │ 3. Log each page progress                               │  │   │
│  │  │ 4. Normalize leads to fichas format                     │  │   │
│  │  │ 5. Upsert in batches to fichas table                    │  │   │
│  │  │ 6. Update sync_status                                   │  │   │
│  │  │ 7. Insert sync_logs entry                               │  │   │
│  │  │ 8. Return detailed results                              │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  sync-tabulador (Bidirectional)                              │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Create clients with proper headers                   │  │   │
│  │  │ 2. Get last sync timestamp                              │  │   │
│  │  │ 3. Fetch updates from Gestão (fichas)                   │  │   │
│  │  │ 4. Fetch updates from TabuladorMax (leads)              │  │   │
│  │  │ 5. Detect conflicts (same ID modified in both)          │  │   │
│  │  │ 6. Sync Gestão → TabuladorMax                           │  │   │
│  │  │ 7. Sync TabuladorMax → Gestão                           │  │   │
│  │  │ 8. Resolve conflicts (most recent wins)                 │  │   │
│  │  │ 9. Update sync_status                                   │  │   │
│  │  │ 10. Insert sync_logs entry                              │  │   │
│  │  │ 11. Return sync summary                                 │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

                                    ▼

┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                                 │
│                                                                       │
│  ┌────────────────────────┐      ┌────────────────────────┐         │
│  │  Gestão Scouter DB     │      │  TabuladorMax DB       │         │
│  │  (ngestyxtopvfeyenyvgt)│      │  (gkvvtfqfggddzotxltxf)│         │
│  │                        │      │                        │         │
│  │  Tables:               │◄────►│  Tables:               │         │
│  │  - fichas              │      │  - leads               │         │
│  │  - users               │      │  - (source of truth)   │         │
│  │  - roles               │      │                        │         │
│  │  - sync_status         │      │                        │         │
│  │  - sync_logs           │      │                        │         │
│  └────────────────────────┘      └────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados - Sincronização

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SYNC FLOW DIAGRAM                                │
└─────────────────────────────────────────────────────────────────────┘

User clicks "Sincronizar Agora"
         │
         ▼
┌────────────────────┐
│  TabuladorSync     │  🔄 Iniciando sincronização...
│  Component         │  📡 Endpoint logged
│                    │  🎯 Table: leads ↔️ fichas
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  supabase          │  Invoke edge function
│  .functions        │  'sync-tabulador'
│  .invoke()         │
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  Edge Function: sync-tabulador                             │
│                                                             │
│  🕐 Get last sync timestamp                                │
│  📥 Fetch from Gestão:   fichas.updated_at >= timestamp    │
│  📥 Fetch from TabuladorMax: leads.updated_at >= timestamp │
│                                                             │
│  🔀 Detect conflicts (same ID in both)                     │
│                                                             │
│  ┌─────────────────┐        ┌─────────────────┐           │
│  │ Gestão Updates  │        │Tabulador Updates│           │
│  │   (5 records)   │        │   (10 records)  │           │
│  └────────┬────────┘        └────────┬────────┘           │
│           │                          │                     │
│           ▼                          ▼                     │
│  🔄 Map fichas → leads      🔄 Map leads → fichas         │
│  📤 Upsert to TabuladorMax  📥 Upsert to Gestão           │
│                                                             │
│  📊 Log results:                                           │
│     - gestao_to_tabulador: 5                               │
│     - tabulador_to_gestao: 10                              │
│     - conflicts_resolved: 2                                │
│                                                             │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────┐
│  createSyncLog()                       │
│  - endpoint: sync-tabulador            │
│  - table: leads ↔️ fichas              │
│  - status: success                     │
│  - records_count: 15                   │
│  - execution_time_ms: 1234             │
│  - response_data: {full details}       │
└────────────────────┬───────────────────┘
                     │
                     ├────► localStorage
                     └────► Supabase (if table exists)
                     
                     ▼
┌────────────────────────────────────────┐
│  UI Updates                            │
│  - Toast: "15 registros sincronizados" │
│  - Console: ✅ Success logs            │
│  - Logs tab: New entry added           │
└────────────────────────────────────────┘
```

## 📊 Fluxo de Logs

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LOGGING FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

Any sync operation
         │
         ▼
┌────────────────────┐
│  Start timer       │  const startTime = Date.now()
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Log to console    │  console.log('🚀 [Component] Message')
│  (Real-time)       │  console.log('📡 [Component] Endpoint')
│                    │  console.log('🎯 [Component] Table')
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Execute operation │  Try to sync/migrate/test
└────────┬───────────┘
         │
         ├─── Success ───────────┐
         │                       │
         │                       ▼
         │              ┌────────────────────┐
         │              │  Log success       │
         │              │  ✅ [Component]    │
         │              │  📊 Stats          │
         │              │  ⏱️ Time           │
         │              └────────┬───────────┘
         │                       │
         └─── Error ─────────┐   │
                             │   │
                             ▼   │
                    ┌────────────┴───────────┐
                    │  Log error             │
                    │  ❌ [Component]        │
                    │  Error details         │
                    │  Troubleshooting       │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Calculate exec time   │
                    │  Date.now() - startTime│
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────┐
                    │  createSyncLog()                       │
                    │  {                                     │
                    │    endpoint,                           │
                    │    table_name,                         │
                    │    status,                             │
                    │    records_count,                      │
                    │    execution_time_ms,                  │
                    │    error_message?,                     │
                    │    response_data?                      │
                    │  }                                     │
                    └────────────┬───────────────────────────┘
                                 │
                    ┌────────────┴───────────┐
                    │                        │
                    ▼                        ▼
          ┌──────────────────┐    ┌─────────────────────┐
          │  localStorage    │    │  Supabase           │
          │  (Primary)       │    │  (Backup if exists) │
          │  - Fast access   │    │  - Persistence      │
          │  - Last 100 logs │    │  - Shared access    │
          └──────────────────┘    └─────────────────────┘
                    │
                    ▼
          ┌──────────────────────────────┐
          │  SyncLogsViewer Component    │
          │  - Fetches from both sources │
          │  - Displays in table         │
          │  - Auto-refresh 30s          │
          │  - Expandable details        │
          └──────────────────────────────┘
```

## 🔐 Security & Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CONFIGURATION STORAGE                              │
└─────────────────────────────────────────────────────────────────────┘

TabuladorMax Config
         │
         ├────► PRIMARY: localStorage
         │      ├─ Key: "tabuladormax_config"
         │      ├─ Fast access (no network)
         │      ├─ Persists across sessions
         │      └─ Client-side only
         │
         └────► BACKUP: Supabase
                ├─ Table: tabulador_config (optional)
                ├─ Shared across devices
                ├─ Centralized management
                └─ Requires table creation

Sync Logs
         │
         ├────► PRIMARY: localStorage
         │      ├─ Key: "sync_logs_detailed"
         │      ├─ Last 100 logs
         │      ├─ Instant access
         │      └─ No database overhead
         │
         └────► BACKUP: Supabase
                ├─ Table: sync_logs_detailed (optional)
                ├─ Unlimited history
                ├─ Query capabilities
                └─ Requires table creation

⚠️  Security Notes:
    • Only publishable (anon) keys stored in frontend
    • Service role keys ONLY in Edge Functions
    • Environment variables for sensitive data
    • RLS enabled on all tables
```

## 📈 Performance Characteristics

```
Operation              | Execution Time | Records/Batch | Notes
-----------------------|----------------|---------------|------------------
Test Connection        | 200-500ms      | 5 sample      | Quick diagnostic
Initial Migration      | 5-30s          | 1000/batch    | Depends on total
Sync (Incremental)     | 1-5s           | Variable      | Only changed data
Log Creation           | 10-50ms        | 1             | Near instant
Log Retrieval          | 10-100ms       | 50-100        | localStorage fast
Config Save            | 10-50ms        | 1             | localStorage fast
Config Load            | 5-20ms         | 1             | localStorage fast
```

## 🎯 Error Handling Flow

```
Request Made
     │
     ▼
┌────────────────┐
│ Try Operation  │
└────┬───────────┘
     │
     ├─── Success ─────► Log success ─────► Continue
     │
     └─── Error ──────┐
                      │
                      ▼
            ┌──────────────────┐
            │ Check Error Code  │
            └──────┬───────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┐
    │              │              │              │
    ▼              ▼              ▼              ▼
┌───────┐     ┌───────┐     ┌───────┐     ┌───────┐
│  406  │     │PGRST  │     │ 42501 │     │ Other │
│Header │     │116    │     │ Perm  │     │       │
│Issue  │     │No Tbl │     │Denied │     │       │
└───┬───┘     └───┬───┘     └───┬───┘     └───┬───┘
    │             │             │             │
    ▼             ▼             ▼             ▼
┌────────────────────────────────────────────────┐
│       Show Specific Troubleshooting            │
│                                                │
│ 406: Check headers (Prefer, Content-Type)     │
│ PGRST116: Table not found, check name         │
│ 42501: Permission denied, check RLS           │
│ Other: Generic error handling                 │
└────────────────────┬───────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Log Error      │
            │ - Console      │
            │ - UI Log       │
            │ - Toast        │
            └────────────────┘
```

## 🎨 UI Component Hierarchy

```
ConfiguracoesPage
│
├─── Tabs
│    ├─── Usuários
│    │    └─── UsersPanel (Fixed)
│    ├─── Permissões
│    │    └─── PermissionsPanel
│    └─── Integrações
│         └─── IntegrationsPanel
│              │
│              ├─── Tab: Configuração
│              │    └─── TabuladorMaxConfigPanel
│              │         ├─── Form (Project ID, URL, Key)
│              │         ├─── Test Button
│              │         └─── Save Button
│              │
│              ├─── Tab: Sincronização
│              │    └─── TabuladorSync
│              │         ├─── Status Card
│              │         ├─── Migration Button
│              │         ├─── Sync Button
│              │         ├─── Test Button
│              │         └─── Logs Table
│              │
│              ├─── Tab: Logs
│              │    └─── SyncLogsViewer
│              │         ├─── Logs Table
│              │         │    ├─── Status Column
│              │         │    ├─── Endpoint Column
│              │         │    ├─── Table Column
│              │         │    ├─── Records Column
│              │         │    ├─── Time Column
│              │         │    └─── Details Column (expandable)
│              │         ├─── Refresh Button
│              │         └─── Clear Button
│              │
│              ├─── Tab: Importação CSV
│              │    └─── BulkImportPanel
│              │
│              └─── Tab: Webhooks
│                   └─── SupabaseIntegration
```

---

**Generated:** 2025-10-17  
**Version:** 1.0  
**Status:** Production Ready 🚀
