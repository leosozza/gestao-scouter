# Gestão Scouter - Sistema de Gerenciamento

Sistema completo de gerenciamento para scouters com dashboard analítico, controle financeiro e integração com Google Sheets e Supabase.

## 🚀 Funcionalidades

- **Dashboard Analítico**: Métricas em tempo real com gráficos e indicadores
- **Gerenciamento de Fichas**: Controle completo de leads e conversões
- **Sistema de Pagamentos**: Gestão financeira com controle de ajuda de custo
- **Integração Google Sheets**: Sincronização automática com planilhas
- **Análise por IA**: Relatórios inteligentes baseados nos dados
- **Sistema de Projeções**: Previsões e metas personalizadas
- **Controle de Scouters**: Gestão de equipe e performance

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite 7
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Integrações**: Google Sheets API, Bitrix24
- **Gráficos**: Recharts
- **Relatórios**: jsPDF + AutoTable
- **Estado**: TanStack Query + React Hooks

## 🏗️ Arquitetura

### Code Splitting & Performance
- **Lazy Loading**: Páginas carregadas sob demanda
- **Chunk Optimization**: Bundles otimizados por categoria
  - React Core (~142KB)
  - UI Components (~95KB) 
  - Charts (~392KB)
  - Date Utils (~58KB)
  - Supabase (~123KB)
- **Tree Shaking**: Importações otimizadas

### Type Safety
- **TypeScript**: Tipagem estrita em todo o projeto
- **Interfaces Customizadas**: Tipos para Ficha, Project, Lead, etc.
- **Error Handling**: Tratamento robusto de erros
- **React Hooks**: Dependências otimizadas

## 🔧 Instalação e Uso

### Pré-requisitos
- Node.js 18+ ([instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm ou yarn

### Configuração Local

```sh
# 1. Clone o repositório
git clone https://github.com/leosozza/gestao-scouter.git
cd gestao-scouter

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Build para produção
npm run build

# 6. Preview da build de produção
npm run preview
```

### Variáveis de Ambiente

```env
VITE_SUPABASE_PROJECT_ID=seu_project_id
VITE_SUPABASE_URL=https://seu_projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

## 📊 Integração Google Sheets

O sistema suporta integração com Google Sheets através de:

1. **URL de Planilha**: Configuração via interface
2. **Proxy CORS**: Bypass automático durante desenvolvimento
3. **Fallback System**: Dados mock quando API indisponível
4. **Formato Esperado**: Templates disponíveis no sistema

### Estrutura da Planilha de Fichas
- **ID**: Identificador único
- **Projetos Comerciais**: Nome do projeto
- **Gestão de Scouter**: Nome do scouter
- **Data de criação da Ficha**: DD/MM/AAAA HH:MM
- **Valor por Fichas**: R$ X,XX

## 🔄 Sync em tempo real (Sheets → Supabase)

### Configuração
1) Publique a Edge Function `sheets-upsert`:
   ```bash
   supabase functions deploy sheets-upsert
   ```

2) Configure as variáveis de ambiente:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   SHEETS_SYNC_SHARED_SECRET=seu_segredo_compartilhado
   SHEETS_EXPECTED_COLUMNS="ID,Projetos Comerciais,Gestão de Scouter,Criado,Valor por Fichas"
   ```

3) No Google Sheets, crie um Apps Script com o código abaixo:

```javascript
// Google Apps Script para sincronização com Supabase
const EDGE_FUNCTION_URL = 'https://SEU_PROJETO.supabase.co/functions/v1/sheets-upsert';
const SHARED_SECRET = 'seu_segredo_compartilhado';

function onEdit(e) {
  // Envia linha editada em tempo real
  const range = e.range;
  const sheet = range.getSheet();
  
  if (sheet.getName() !== 'Fichas') return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = sheet.getRange(range.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const rowObject = {};
  headers.forEach((header, index) => {
    rowObject[header] = rowData[index];
  });
  
  syncToSupabase([rowObject]);
}

function syncAll() {
  // Menu personalizado para sincronização completa
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Fichas');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const rowObjects = rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  
  syncToSupabase(rowObjects);
}

function syncToSupabase(rows) {
  try {
    const response = UrlFetchApp.fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': SHARED_SECRET
      },
      payload: JSON.stringify({ rows: rows })
    });
    
    if (response.getResponseCode() === 200) {
      const result = JSON.parse(response.getContentText());
      Logger.log(`Sincronização concluída: ${result.upserted} fichas atualizadas`);
    } else {
      Logger.log(`Erro na sincronização: ${response.getContentText()}`);
    }
  } catch (error) {
    Logger.log(`Erro: ${error.toString()}`);
  }
}

function onOpen() {
  // Adiciona menu personalizado
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Sync')
    .addItem('Sincronizar tudo', 'syncAll')
    .addToUi();
}
```

4) Configure os triggers:
   - `onEdit`: Trigger automático para edições
   - `onOpen`: Adiciona menu personalizado
   - `syncAll`: Função para sincronização completa

5) Após validar, altere `DATA_SOURCE` para `"supabase"` nas telas (Dashboard/Leads/Projeção/Pagamentos).

## 🔒 Segurança

### Status de Segurança
- ✅ **esbuild**: Atualizado para v0.24.3+
- ✅ **jsPDF**: Vulnerabilidade de DoS corrigida  
- ✅ **Vite**: Atualizado para v7.1.7
- ⚠️ **xlsx**: Vulnerabilidade de prototype pollution (planejada substituição)

### Melhores Práticas
- Validação de tipos TypeScript
- Sanitização de inputs
- Headers de segurança configurados
- Autenticação via Supabase Auth

## 📈 Performance

### Otimizações Implementadas
- **Bundle Size**: Reduzido de 1MB+ para chunks < 400KB
- **Lazy Loading**: Carregamento sob demanda de páginas
- **Code Splitting**: Separação inteligente de dependências
- **Tree Shaking**: Remoção de código não utilizado
- **Gzip Compression**: ~70% redução de tamanho

### Métricas
- **Largest Chunk**: 392KB (charts)
- **Main App**: ~100KB
- **UI Components**: 95KB
- **Load Time**: < 2s em conexões 3G

## 🧪 Desenvolvimento

### Scripts Disponíveis
```sh
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção  
npm run preview    # Preview da build
npm run lint       # Análise de código
npm run lint:fix   # Correção automática
```

### Padrões de Código
- **ESLint**: Configuração TypeScript + React
- **Prettier**: Formatação automática
- **Husky**: Git hooks para qualidade
- **Conventional Commits**: Padronização de commits

## 📝 Contribuição

1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Suporte

- **Documentação**: Ver `/docs` no repositório
- **Issues**: GitHub Issues para bugs e sugestões
- **Discussões**: GitHub Discussions para dúvidas

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para otimização de processos de scouting**
