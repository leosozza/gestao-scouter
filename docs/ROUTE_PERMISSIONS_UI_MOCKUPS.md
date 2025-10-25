# Route Permissions Manager - UI Screenshots and Mockups

## Overview
This document provides visual mockups and descriptions of the Route Permissions Manager UI since live screenshots require database access and authentication.

## Main Interface

### Tab Location
The Route Permissions Manager is accessible from:
- **Page**: Configurações (Settings)
- **Tab**: "Permissões por Página" (Page Permissions)
- **Icon**: Route icon (🛣️)
- **Position**: Third tab, between "Permissões" and "Integrações"

### Header Section
```
┌─────────────────────────────────────────────────────────────────┐
│  Gerenciamento de Permissões por Página                         │
│  Configure quais departamentos e funções podem acessar cada      │
│  rota da aplicação.                                             │
│  ⚠️ Requer permissão de Admin                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Controls
```
┌─────────────────────────────────────────────────────────────────┐
│ Buscar                                    │ Módulo              │
│ ┌──────────────────────────────────────┐ │ ┌─────────────────┐│
│ │ 🔍 Buscar por nome, caminho...       │ │ │ Todos Módulos  ▼││
│ └──────────────────────────────────────┘ │ └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Action Buttons
```
┌─────────────────────────────────────────────────────────────────┐
│ [💾 Salvar Alterações (3)] [🔄 Recarregar] [⬇️ Exportar JSON]  │
└─────────────────────────────────────────────────────────────────┘
```

## Permission Matrix

### Dashboard Module
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ dashboard                                                                      │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ Rota              │ Caminho      │ scouter          │ telemarketing  │ admin  │
│                   │              │ Agt Sup Mgr Adm  │ Agt Sup Mgr Adm│ Adm    │
├───────────────────┼──────────────┼──────────────────┼────────────────┼────────┤
│ Dashboard         │ /            │ ☑   ☑   ☑   ☑   │ ☑   ☑   ☑   ☑ │ ☑     │
│ Principal         │              │                  │                │        │
│ Página inicial... │              │                  │                │        │
├───────────────────┼──────────────┼──────────────────┼────────────────┼────────┤
│ Dashboard         │ /dashboard   │ ☑   ☑   ☑   ☑   │ ☐   ☑   ☑   ☑ │ ☑     │
│ Dashboard de      │              │                  │                │        │
│ métricas e KPIs   │              │                  │                │        │
└───────────────────┴──────────────┴──────────────────┴────────────────┴────────┘
```

### Leads Module
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ leads                                                                          │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ Rota              │ Caminho      │ scouter          │ telemarketing  │ admin  │
│                   │              │ Agt Sup Mgr Adm  │ Agt Sup Mgr Adm│ Adm    │
├───────────────────┼──────────────┼──────────────────┼────────────────┼────────┤
│ Leads             │ /leads       │ ☑   ☑   ☑   ☐   │ ☑   ☑   ☑   ☑ │ ☑     │
│ Gestão de leads   │              │ [Yellow border]  │                │        │
│ e fichas          │              │                  │                │        │
└───────────────────┴──────────────┴──────────────────┴────────────────┴────────┘
```

### Fichas Module
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ fichas                                                                         │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ Rota                │ Caminho              │ scouter    │ telemarketing │ adm │
│                     │                      │ Agt Sup Mgr│ Agt Sup Mgr   │ Adm │
├─────────────────────┼──────────────────────┼────────────┼───────────────┼─────┤
│ Área de Abordagem   │ /area-de-abordagem   │ ☑   ☑   ☐ │ ☐   ☐   ☐    │ ☑   │
│ Área de cadastro    │                      │            │               │     │
│ de fichas           │                      │            │               │     │
└─────────────────────┴──────────────────────┴────────────┴───────────────┴─────┘
```

## UI States

### Loading State
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                  🔄 Carregando permissões de rotas...           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Empty State (No Results)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│           Nenhuma rota encontrada com os filtros aplicados.     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pending Changes Warning
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Você tem 5 alteração(ões) pendente(s).                       │
│ Clique em "Salvar Alterações" para aplicá-las.                 │
└─────────────────────────────────────────────────────────────────┘
```

## Interaction Flow

### 1. Initial Load
```
User navigates to Configurações → Permissões por Página
    ↓
Component fetches routes from app_routes table
    ↓
Component fetches permissions from route_permissions table
    ↓
Matrix is rendered with current permissions
```

### 2. Toggle Permission
```
User clicks checkbox for "Leads" route, "scouter" dept, "Admin" role
    ↓
Checkbox state changes immediately
    ↓
Checkbox gets yellow border (pending change indicator)
    ↓
Pending changes counter increments: (1) → (2)
    ↓
Warning banner appears at bottom
```

### 3. Save Changes
```
User clicks "Salvar Alterações" button
    ↓
Button shows loading state
    ↓
All pending changes sent to set_route_permissions_batch RPC
    ↓
Database updates permissions in transaction
    ↓
Success toast: "✅ 5 permissões atualizadas com sucesso"
    ↓
Pending changes cleared
    ↓
Yellow borders removed
    ↓
Data refreshed from database
```

### 4. Search/Filter
```
User types "dashboard" in search box
    ↓
Routes filtered in real-time
    ↓
Only routes matching "dashboard" are shown
    ↓
Module grouping maintained
```

### 5. Export JSON
```
User clicks "Exportar JSON" button
    ↓
Current state serialized to JSON
    ↓
Browser downloads file: route-permissions-2025-10-25.json
    ↓
Success toast: "✅ Exportado com sucesso"
```

## Responsive Design

### Desktop View (>1024px)
- Full permission matrix visible
- All columns displayed
- Tab labels show full text

### Tablet View (768px - 1024px)
- Horizontal scroll on permission matrix
- Tab labels abbreviated on smaller screens
- Filters stack vertically

### Mobile View (<768px)
- Tab shows "Rotas" instead of "Permissões por Página"
- Matrix requires horizontal scroll
- Filters stack vertically
- Action buttons stack vertically

## Color Scheme

### Light Mode
- Background: White (#FFFFFF)
- Table borders: Gray-200 (#E5E7EB)
- Checkbox: Primary color
- Pending changes: Yellow-50 background, Yellow-800 text
- Headers: Gray-900 text

### Dark Mode
- Background: Gray-950
- Table borders: Gray-800
- Checkbox: Primary color
- Pending changes: Yellow-950/20 background, Yellow-200 text
- Headers: White text

## Toast Messages

### Success Messages
```
✅ Dados carregados com sucesso
✅ 5 permissões atualizadas com sucesso
✅ Exportado com sucesso
```

### Error Messages
```
❌ Erro ao carregar dados
❌ Erro ao salvar: [error details]
```

### Info Messages
```
ℹ️ Nenhuma alteração pendente
```

### Warning Messages
```
⚠️ 3 permissões atualizadas, 1 falhou
```

## Accessibility Features

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Enter/Space to toggle checkboxes
   - Focus indicators visible

2. **Screen Reader Support**
   - Table headers properly labeled
   - Button purposes announced
   - Checkbox states announced

3. **ARIA Labels**
   - Search input: "Buscar rotas"
   - Module select: "Filtrar por módulo"
   - Checkboxes: "Permissão para [route] - [dept] - [role]"

## Performance Considerations

1. **Pagination** (future enhancement)
   - Currently loads all routes
   - Consider pagination for 50+ routes

2. **Virtual Scrolling** (future enhancement)
   - For large permission matrices
   - Only render visible rows

3. **Debounced Search**
   - Search filters apply in real-time
   - No artificial delay needed for current dataset size

## Data Examples

### Route Data
```json
{
  "id": 1,
  "module": "dashboard",
  "route_path": "/dashboard",
  "route_name": "Dashboard",
  "description": "Dashboard de métricas e KPIs",
  "is_active": true
}
```

### Permission Data
```json
{
  "id": 1,
  "route_id": 1,
  "department": "scouter",
  "role": "Agent",
  "allowed": true
}
```

### Batch Update Request
```json
[
  {
    "route_id": 1,
    "department": "scouter",
    "role": "Agent",
    "allowed": true
  },
  {
    "route_id": 2,
    "department": "telemarketing",
    "role": "Supervisor",
    "allowed": false
  }
]
```

### Export JSON Structure
```json
{
  "routes": [...],
  "permissions": [...],
  "exported_at": "2025-10-25T14:22:28.152Z"
}
```

## Notes for Testers

1. **Admin Access Required**: Only users with admin role can view and edit
2. **Database Migration**: Must run migration before using
3. **RLS Policies**: Supabase RLS enforces admin-only access
4. **Batch Updates**: All changes saved in single transaction
5. **Real-time Updates**: Changes reflect immediately after save
6. **Export**: Useful for backup and configuration management
