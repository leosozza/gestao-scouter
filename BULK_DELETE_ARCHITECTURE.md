# Bulk Delete Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                             │
│                         (src/pages/Leads.tsx)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    DataTable Component                        │ │
│  │                                                               │ │
│  │  ┌────┐  ┌────┐  ┌────┐  ┌────┐                             │ │
│  │  │ ☐  │  │ ☐  │  │ ☑  │  │ ☑  │  ← Checkboxes               │ │
│  │  └────┘  └────┘  └────┘  └────┘                             │ │
│  │  Lead 1  Lead 2  Lead 3  Lead 4                              │ │
│  │                    ↓                                          │ │
│  │              selectedLeads[Lead3, Lead4]                      │ │
│  │                    ↓                                          │ │
│  │          onSelectionChange(selected)                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                         ↓                                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     Action Buttons                           │ │
│  │                                                               │ │
│  │  ┌───────────────────────────┐  ┌──────────────┐            │ │
│  │  │ 🗑️  Excluir Selecionados  │  │ ❤️  Análise  │            │ │
│  │  │         (2)               │  │     (2)      │            │ │
│  │  └───────────────────────────┘  └──────────────┘            │ │
│  │             ↓                                                 │ │
│  │    handleDeleteClick()                                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                         ↓                                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              AlertDialog (Confirmation)                       │ │
│  │                                                               │ │
│  │  ╔════════════════════════════════════════╗                  │ │
│  │  ║      Confirmar Exclusão                ║                  │ │
│  │  ╠════════════════════════════════════════╣                  │ │
│  │  ║                                        ║                  │ │
│  │  ║  Você tem certeza que deseja excluir   ║                  │ │
│  │  ║  2 lead(s) selecionado(s)?             ║                  │ │
│  │  ║  Esta ação não pode ser desfeita.      ║                  │ │
│  │  ║                                        ║                  │ │
│  │  ╠════════════════════════════════════════╣                  │ │
│  │  ║        [Cancelar]    [Excluir]         ║                  │ │
│  │  ╚════════════════════════════════════════╝                  │ │
│  │                    ↓                                          │ │
│  │         handleConfirmDelete()                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                           │
│                    (src/pages/Leads.tsx)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  handleConfirmDelete() {                                            │
│    ┌────────────────────────────────────────┐                      │
│    │ 1. Set isDeleting = true              │                      │
│    │ 2. Extract lead IDs from selected     │                      │
│    │ 3. Filter valid IDs (non-null)        │                      │
│    │ 4. Call deleteLeads(leadIds)          │  ────────┐           │
│    │ 5. Show success toast                 │          │           │
│    │ 6. Refresh leads list                 │          │           │
│    │ 7. Clear selection                    │          │           │
│    │ 8. Close dialog                       │          │           │
│    │ 9. Set isDeleting = false             │          │           │
│    └────────────────────────────────────────┘          │           │
│                                                         │           │
└─────────────────────────────────────────────────────────┼───────────┘
                                                          │
                                                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                              │
│                  (src/repositories/leadsRepo.ts)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  deleteLeads(leadIds: number[]) {                                   │
│    ┌────────────────────────────────────────┐                      │
│    │ 1. Validate input (non-empty)         │                      │
│    │ 2. Log deletion request               │                      │
│    │ 3. Call Supabase API                  │  ────────┐           │
│    │    - .from('fichas')                  │          │           │
│    │    - .delete()                        │          │           │
│    │    - .in('id', leadIds)               │          │           │
│    │ 4. Check for errors                   │          │           │
│    │ 5. Log success/failure                │          │           │
│    │ 6. Return count or throw error        │          │           │
│    └────────────────────────────────────────┘          │           │
│                                                         │           │
└─────────────────────────────────────────────────────────┼───────────┘
                                                          │
                                                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                               │
│                     (Supabase - PostgreSQL)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────┐                       │
│  │        Table: fichas                    │                       │
│  ├─────────────────────────────────────────┤                       │
│  │ id │ nome      │ scouter │ projeto  │...│                       │
│  ├────┼───────────┼─────────┼──────────┼───┤                       │
│  │ 1  │ João      │ Maria   │ Alpha    │...│                       │
│  │ 2  │ Ana       │ Pedro   │ Beta     │...│                       │
│  │ 3  │ Carlos    │ João    │ Alpha    │...│  ← DELETE WHERE      │
│  │ 4  │ Maria     │ Ana     │ Gamma    │...│    id IN (3, 4)      │
│  └─────────────────────────────────────────┘                       │
│                         ↓                                           │
│              Rows Deleted: 2                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          FEEDBACK LOOP                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────┐                      │
│  │         Success Toast                    │                      │
│  │  ┌────────────────────────────────────┐  │                      │
│  │  │ ✅ 2 lead(s) excluído(s) com       │  │                      │
│  │  │    sucesso                         │  │                      │
│  │  └────────────────────────────────────┘  │                      │
│  └──────────────────────────────────────────┘                      │
│                                                                     │
│  ┌──────────────────────────────────────────┐                      │
│  │         List Refresh                     │                      │
│  │                                          │                      │
│  │  Lead 1  [View] [Edit]                   │                      │
│  │  Lead 2  [View] [Edit]                   │                      │
│  │  ~~Lead 3~~  (deleted)                   │                      │
│  │  ~~Lead 4~~  (deleted)                   │                      │
│  │                                          │                      │
│  │  Showing 2 results                       │                      │
│  └──────────────────────────────────────────┘                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## State Flow Diagram

```
┌──────────────┐
│ Initial Load │
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ leads = []           │
│ selectedLeads = []   │
│ showDeleteDialog = F │
│ isDeleting = false   │
└──────┬───────────────┘
       │
       ↓ User selects leads
┌──────────────────────┐
│ selectedLeads = [L1] │ ← onSelectionChange
└──────┬───────────────┘
       │
       ↓ User clicks delete
┌──────────────────────┐
│ showDeleteDialog = T │ ← handleDeleteClick
└──────┬───────────────┘
       │
       ↓ User confirms
┌──────────────────────┐
│ isDeleting = true    │ ← handleConfirmDelete
└──────┬───────────────┘
       │
       ↓ Database operation
┌──────────────────────┐
│ deleteLeads()        │
│ → Supabase DELETE    │
└──────┬───────────────┘
       │
       ├── Success ──→ ┌──────────────────────┐
       │               │ Toast: Success       │
       │               │ loadLeads()          │
       │               │ selectedLeads = []   │
       │               │ showDeleteDialog = F │
       │               │ isDeleting = false   │
       │               └──────────────────────┘
       │
       └── Error ────→ ┌──────────────────────┐
                       │ Toast: Error         │
                       │ isDeleting = false   │
                       │ (dialog stays open)  │
                       └──────────────────────┘
```

## Component Hierarchy

```
Leads.tsx
├── AppShell
│   ├── Sidebar
│   └── Main Content
│       ├── Header Section
│       │   ├── Title & Description
│       │   └── FilterHeader
│       │
│       ├── Summary Cards (7)
│       │   ├── Total de Leads
│       │   ├── Convertidos
│       │   ├── Agendados
│       │   ├── Em Contato
│       │   ├── Aprovados
│       │   ├── Reprovados
│       │   └── Para Analisar
│       │
│       ├── Grid (2 columns)
│       │   ├── Card: Lista de Leads
│       │   │   ├── CardHeader
│       │   │   │   ├── Title
│       │   │   │   └── Action Buttons
│       │   │   │       ├── [NEW] Excluir Selecionados
│       │   │   │       ├── Iniciar Análise
│       │   │   │       └── Exportar
│       │   │   │
│       │   │   └── CardContent
│       │   │       └── DataTable
│       │   │           ├── Checkboxes (selectable=true)
│       │   │           ├── Columns (data display)
│       │   │           └── Actions (view/edit)
│       │   │
│       │   └── AIAnalysis
│       │
│       ├── [NEW] AlertDialog (Delete Confirmation)
│       │   ├── AlertDialogContent
│       │   │   ├── AlertDialogHeader
│       │   │   │   ├── AlertDialogTitle
│       │   │   │   └── AlertDialogDescription
│       │   │   │
│       │   │   └── AlertDialogFooter
│       │   │       ├── AlertDialogCancel
│       │   │       └── AlertDialogAction (Excluir)
│       │
│       └── TinderAnalysisModal
```

## Data Flow

```
User Action → Handler → State Update → Re-render → DB Call → Response → State Update → UI Update

Example for Delete:

Click Delete Button
       ↓
handleDeleteClick()
       ↓
setShowDeleteDialog(true)
       ↓
Dialog Renders
       ↓
Click "Excluir"
       ↓
handleConfirmDelete()
       ↓
setIsDeleting(true)
       ↓
Button shows "Excluindo..."
       ↓
deleteLeads([3, 4])
       ↓
Supabase: DELETE FROM fichas WHERE id IN (3, 4)
       ↓
Response: Success (2 rows)
       ↓
toast.success("2 lead(s) excluído(s)")
       ↓
loadLeads() → Fetch fresh data
       ↓
setLeads(newData)
       ↓
setSelectedLeads([])
       ↓
setShowDeleteDialog(false)
       ↓
setIsDeleting(false)
       ↓
Table re-renders with updated data
```

## Error Flow

```
handleConfirmDelete()
       ↓
deleteLeads([3, 4])
       ↓
Supabase: DELETE FROM fichas WHERE id IN (3, 4)
       ↓
Response: Error (Network issue / Permission denied)
       ↓
throw Error("Erro ao deletar leads: ...")
       ↓
catch (error)
       ↓
toast.error("Erro ao deletar leads", { description: error.message })
       ↓
setIsDeleting(false)
       ↓
Dialog remains open
       ↓
User can retry or cancel
```

## Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: UI Validation                 │
│  - Check selectedLeads.length > 0       │
│  - Filter invalid IDs                   │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Layer 2: Repository Validation         │
│  - Check leadIds array not empty        │
│  - Validate ID types                    │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Layer 3: Database Query                │
│  - Parameterized query (.in())          │
│  - SQL injection protection             │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Layer 4: Supabase RLS Policies         │
│  - Row Level Security enforcement       │
│  - User permissions check               │
└─────────────────────────────────────────┘
```

This architecture ensures a secure, maintainable, and user-friendly bulk delete implementation.
