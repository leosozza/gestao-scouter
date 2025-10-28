# Guia Visual: Melhorias na Página de Leads

## 🎨 Comparação Visual: Antes vs Depois

### ANTES - Header do Card de Leads
```
┌─────────────────────────────────────────────────────────────────┐
│  Lista de Leads                                                 │
│                                                                 │
│  [💗 Iniciar Análise (0)]  [📥 Exportar] ← BOTÃO DUPLICADO     │
└─────────────────────────────────────────────────────────────────┘
│                                                                 │
│  [🔍 Buscar...] [Filtros...]                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TABELA DE LEADS                                        │   │
│  │  [📥 Exportar] ← BOTÃO JÁ EXISTIA NO DATATABLE         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### DEPOIS - Header do Card de Leads
```
┌─────────────────────────────────────────────────────────────────┐
│  Lista de Leads                                                 │
│                                                                 │
│  [➕ Criar Lead]  [💗 Iniciar Análise (0)] ← NOVO BOTÃO        │
└─────────────────────────────────────────────────────────────────┘
│                                                                 │
│  [🔍 Buscar...] [Filtros...]                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TABELA DE LEADS                                        │   │
│  │  [📥 Exportar] ← MANTIDO (único botão de exportar)     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📱 Novo Componente: CreateLeadDialog

### Fluxo de Interação

```
   Usuário clica em        Modal é exibido         Formulário é
   "Criar Lead"           com formulário          preenchido
        │                       │                      │
        ▼                       ▼                      ▼
   ┌─────────┐            ┌──────────┐           ┌──────────┐
   │  Botão  │  ────────▶ │  Dialog  │  ────────▶│ Validação│
   │   (+)   │            │  Aberto  │           │  Campos  │
   └─────────┘            └──────────┘           └──────────┘
                                                       │
                                                       ▼
                                                  Dados válidos?
                                                       │
                                          ┌────────────┴────────────┐
                                          │                         │
                                        SIM                        NÃO
                                          │                         │
                                          ▼                         ▼
                                  ┌─────────────┐          ┌──────────────┐
                                  │ createLead()│          │ Mostrar Erro │
                                  │   no Repo   │          │  no Campo    │
                                  └─────────────┘          └──────────────┘
                                          │
                                          ▼
                                    Supabase
                                    Inserção
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                           Sucesso                  Erro
                              │                       │
                              ▼                       ▼
                      ┌──────────────┐        ┌──────────────┐
                      │ Toast Verde  │        │ Toast Vermelho│
                      │ "Criado!"    │        │ "Erro..."    │
                      └──────────────┘        └──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │ Refresh Lista│
                      │   de Leads   │
                      └──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │ Fechar Modal │
                      └──────────────┘
```

### Layout do Modal

```
╔════════════════════════════════════════════════════════════╗
║  Criar Novo Lead                                      [X]  ║
╠════════════════════════════════════════════════════════════╣
║  Preencha as informações do lead para adicioná-lo         ║
║  ao sistema                                                ║
║                                                            ║
║  Nome *                                                    ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ Nome completo                                      │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  Telefone *                                                ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ (11) 99999-9999                                    │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  Email                                                     ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ email@exemplo.com                                  │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║  Idade           Modelo                                    ║
║  ┌──────────┐   ┌──────────────────────────────────┐      ║
║  │ 25       │   │ Ex: Fashion                      │      ║
║  └──────────┘   └──────────────────────────────────┘      ║
║                                                            ║
║  Projeto         Status                                    ║
║  ┌──────────┐   ┌──────────────────────────────────┐      ║
║  │ Projeto▼ │   │ Contato                      ▼   │      ║
║  └──────────┘   └──────────────────────────────────┘      ║
║                                                            ║
║  Localização                                               ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ São Paulo, SP                                      │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                            ║
║                       ┌──────────┐  ┌──────────────┐      ║
║                       │ Cancelar │  │ Criar Lead   │      ║
║                       └──────────┘  └──────────────┘      ║
╚════════════════════════════════════════════════════════════╝
```

## 🗄️ Estrutura de Dados

### Lead Criado pela Interface

```json
{
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "email": "joao@exemplo.com",
  "idade": "25",
  "projetos": "Projeto A",
  "scouter": "Sistema",
  "etapa": "Contato",
  "modelo": "Fashion",
  "localizacao": "São Paulo, SP",
  "valor_ficha": "0",
  "ficha_confirmada": "Aguardando",
  "aprovado": null,
  "criado": "2025-10-17T19:56:00.000Z"
}
```

### Lead Fictício do SQL Script

```json
{
  "id": 1,
  "nome": "João Silva",
  "telefone": "(11) 98765-4321",
  "email": "joao123@gmail.com",
  "idade": "25",
  "projeto": "Projeto A",
  "scouter": "João Scouter",
  "etapa": "Contato",
  "modelo": "Fashion",
  "localizacao": "São Paulo, SP",
  "valor_ficha": 250.00,
  "ficha_confirmada": "Sim",
  "cadastro_existe_foto": "SIM",
  "presenca_confirmada": "Sim",
  "local_da_abordagem": "Shopping",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "aprovado": true
}
```

## 📊 Dashboard com Dados de Teste

Após executar o script SQL, a página mostrará:

```
┌─────────────────────────────────────────────────────────────────┐
│                          LEADS                                  │
│  Gerencie todos os leads capturados pela equipe de scouting    │
└─────────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ Total      │ Convertidos│ Agendados  │ Em Contato │ Aprovados  │
│    20      │     6      │     6      │     8      │     12     │
│            │   30.0%    │            │            │   60.0%    │
└────────────┴────────────┴────────────┴────────────┴────────────┘

┌────────────┬────────────┐
│ Reprovados │ P/ Analisar│
│     4      │     4      │
│   20.0%    │            │
└────────────┴────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Lista de Leads                                                 │
│                                                                 │
│  [➕ Criar Lead]  [💗 Iniciar Análise (0)]                     │
├─────────────────────────────────────────────────────────────────┤
│  [🔍 Buscar...]  [Filtros]                      [📥 Exportar]  │
├─────────────────────────────────────────────────────────────────┤
│  Nome          │Scouter       │Projeto    │Status    │Data      │
├────────────────┼──────────────┼───────────┼──────────┼──────────┤
│  João Silva    │João Scouter  │Projeto A  │Contato   │17/10/25  │
│  Maria Santos  │Maria Scouter │Projeto B  │Agendado  │17/10/25  │
│  Ana Costa     │Pedro Scouter │Projeto T. │Convertido│17/10/25  │
│  ...           │...           │...        │...       │...       │
│  (17 mais)     │              │           │          │          │
└────────────────┴──────────────┴───────────┴──────────┴──────────┘
```

## 🔄 Fluxo de Dados

```
┌──────────────┐
│   Usuário    │
│  (Interface) │
└──────┬───────┘
       │ Clica "Criar Lead"
       ▼
┌──────────────────┐
│ CreateLeadDialog │
│   (Componente)   │
└──────┬───────────┘
       │ Submete formulário
       ▼
┌──────────────────┐
│  createLead()    │
│  (leadsRepo.ts)  │
└──────┬───────────┘
       │ INSERT query
       ▼
┌──────────────────┐
│    Supabase      │
│  Tabela: fichas  │
└──────┬───────────┘
       │ Retorna dados
       ▼
┌──────────────────┐
│  loadLeads()     │
│  (Refresh)       │
└──────┬───────────┘
       │ Atualiza estado
       ▼
┌──────────────────┐
│   DataTable      │
│  (Renderiza)     │
└──────────────────┘
```

## 🎯 Estados do Botão "Criar Lead"

### Estado Normal
```
┌───────────────┐
│ ➕ Criar Lead │  ← Verde, cursor pointer
└───────────────┘
```

### Estado Hover
```
┌───────────────┐
│ ➕ Criar Lead │  ← Verde mais escuro
└───────────────┘
```

### Durante Criação
```
┌───────────────┐
│ ⏳ Criando... │  ← Desabilitado, spinner
└───────────────┘
```

## ✅ Checklist de Validação

### Antes de Aprovar o PR:
- [ ] Build passa sem erros
- [ ] Lint passa sem novos warnings
- [ ] TypeScript compila sem erros
- [ ] Não há botão "Exportar" duplicado
- [ ] Botão "Criar Lead" está visível
- [ ] Modal abre ao clicar em "Criar Lead"
- [ ] Validação de campos obrigatórios funciona
- [ ] Toast de sucesso aparece após criar lead
- [ ] Lista de leads atualiza automaticamente
- [ ] Script SQL executa sem erros
- [ ] 20 leads aparecem após executar SQL

### Após Merge:
- [ ] Executar script SQL no ambiente de produção
- [ ] Testar criação de lead em produção
- [ ] Validar permissões no Supabase
- [ ] Monitorar logs de erro
- [ ] Coletar feedback dos usuários

---

**Diagramas criados em:** 2025-10-17  
**Versão:** 1.0
