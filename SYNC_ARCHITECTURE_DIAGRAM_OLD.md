# Arquitetura de Sincronização: Leads → Fichas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROJETO TABULADORMAX                                    │
│                    (gkvvtfqfggddzotxltxf)                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      Tabela: leads                                  │    │
│  │  - id, nome, telefone, email, idade                                │    │
│  │  - projeto, scouter, supervisor                                    │    │
│  │  - localizacao, latitude, longitude                                │    │
│  │  - criado, valor_ficha, etapa                                      │    │
│  │  - ficha_confirmada, foto, etc.                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              ↓ ↓ ↓                                          │
│                     TRIGGERS (Tempo Real)                                   │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  • trigger_sync_lead_insert  (AFTER INSERT)                       │      │
│  │  • trigger_sync_lead_update  (AFTER UPDATE)                       │      │
│  │  • trigger_sync_lead_delete  (AFTER DELETE)                       │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                              ↓                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │         Função: sync_lead_to_fichas()                             │      │
│  │  1. Captura operação (INSERT/UPDATE/DELETE)                       │      │
│  │  2. Monta payload JSON com todos os campos                        │      │
│  │  3. Faz HTTP POST/DELETE para Gestão Scouter                      │      │
│  │  4. Loga resultado (success/warning)                              │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                          HTTP Request (REST API)
                          POST /rest/v1/fichas
                          DELETE /rest/v1/fichas?id=eq.XXX
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PROJETO GESTÃO SCOUTER                                     │
│                   (ngestyxtopvfeyenyvgt)                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │            Supabase REST API (Service Role)                        │    │
│  │  • Recebe upsert/delete via HTTP                                   │    │
│  │  • Valida autenticação (service role key)                          │    │
│  │  • Aplica RLS policies                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                      Tabela: fichas                                 │    │
│  │  - id (PK), nome, telefone, email, idade                           │    │
│  │  - projeto, scouter, supervisor                                    │    │
│  │  - localizacao, latitude, longitude                                │    │
│  │  - criado, valor_ficha, etapa                                      │    │
│  │  - ficha_confirmada, foto                                          │    │
│  │  - raw (jsonb) - backup completo                                   │    │
│  │  - updated_at, deleted                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                  Dashboard Analytics                                │    │
│  │  • Performance por scouter                                         │    │
│  │  • Relatórios e métricas                                           │    │
│  │  • Mapas de calor                                                  │    │
│  │  • Sistema IQS                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                        MIGRAÇÃO INICIAL (Uma vez)
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                    Script: syncLeadsToFichas.ts                              │
│                                                                              │
│  FLUXO DE EXECUÇÃO:                                                          │
│  1. ✅ Validar configuração (.env)                                          │
│  2. ✅ Conectar aos dois projetos Supabase                                  │
│  3. ✅ Buscar todos os leads (paginação automática)                         │
│  4. ✅ Processar em lotes de 1000 registros                                 │
│  5. ✅ Normalizar dados (datas, tipos)                                      │
│  6. ✅ Fazer upsert na tabela fichas                                        │
│  7. ✅ Retry automático em caso de erro (3x)                                │
│  8. ✅ Gerar relatório final                                                │
│                                                                              │
│  PERFORMANCE ESPERADA:                                                       │
│  • 200k registros em ~80-100 segundos                                       │
│  • Taxa: 2000-3000 registros/segundo                                        │
│  • Taxa de sucesso: > 99.9%                                                 │
│                                                                              │
│  COMANDO:                                                                    │
│  $ npm run migrate:leads                                                    │
│  ou                                                                          │
│  $ npx tsx scripts/syncLeadsToFichas.ts                                    │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                               CARACTERÍSTICAS
═══════════════════════════════════════════════════════════════════════════════

┌──────────────────────────┬─────────────────────────────────────────────────┐
│      TRIGGERS SQL        │               SCRIPT MIGRAÇÃO                    │
├──────────────────────────┼─────────────────────────────────────────────────┤
│ ✅ Tempo real (< 100ms)  │ ✅ Migração inicial completa                    │
│ ✅ Automático             │ ✅ Processamento em lotes                       │
│ ✅ INSERT/UPDATE/DELETE   │ ✅ Normalização de dados                        │
│ ✅ Sem polling            │ ✅ Progress tracking                            │
│ ✅ HTTP-based             │ ✅ Retry automático                             │
│ ✅ Logs integrados        │ ✅ Relatório detalhado                          │
│ ⚠️  Requer HTTP extension│ ⚠️  Execução manual                             │
│ ⚠️  Cross-database        │ ⚠️  Uma vez apenas                              │
└──────────────────────────┴─────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                          MAPEAMENTO DE CAMPOS
═══════════════════════════════════════════════════════════════════════════════

leads (origem)              →    fichas (destino)
─────────────────────────────────────────────────────────────────────────────
id                          →    id (string)
nome                        →    nome
telefone                    →    telefone  
email                       →    email
idade                       →    idade (string)
projeto                     →    projeto
scouter                     →    scouter
supervisor                  →    supervisor
localizacao                 →    localizacao
latitude                    →    latitude
longitude                   →    longitude
local_da_abordagem          →    local_da_abordagem
criado                      →    criado (YYYY-MM-DD)
valor_ficha                 →    valor_ficha
etapa                       →    etapa
ficha_confirmada            →    ficha_confirmada
foto                        →    foto
*todos os campos*           →    raw (jsonb backup)
updated_at                  →    updated_at
-                           →    deleted (false)

═══════════════════════════════════════════════════════════════════════════════
                            SEGURANÇA E AUDITORIA
═══════════════════════════════════════════════════════════════════════════════

🔐 SEGURANÇA:
  • Service role keys em variáveis de ambiente
  • .env no .gitignore
  • RLS policies na tabela fichas
  • SECURITY DEFINER nas funções SQL

📝 AUDITORIA:
  • Campo raw preserva dados originais
  • Timestamp updated_at para tracking
  • Logs PostgreSQL para triggers
  • Logs de aplicação para migration script

⚡ PERFORMANCE:
  • Batch processing (1000 registros)
  • Connection pooling
  • Retry com backoff exponencial
  • Progress tracking em tempo real

═══════════════════════════════════════════════════════════════════════════════
```
