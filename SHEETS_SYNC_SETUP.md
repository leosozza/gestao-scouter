# Google Sheets to Supabase Sync Setup

Este documento detalha como configurar a sincronização em tempo real entre Google Sheets e Supabase.

> **Nota**: Para sincronização de leads do Bitrix24, consulte [BITRIX_WEBHOOK_SETUP.md](./BITRIX_WEBHOOK_SETUP.md)

## 1. Configuração do Supabase

### 1.1 Executar Migration
```bash
supabase migration up
```
Isso criará a tabela `fichas` com schema flexível.

### 1.2 Deploy da Edge Function
```bash
supabase functions deploy sheets-upsert
```

### 1.3 Configurar Variáveis de Ambiente
No dashboard do Supabase, configure:

```env
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SHEETS_SYNC_SHARED_SECRET=um_segredo_forte_aqui
SHEETS_EXPECTED_COLUMNS="ID,Projetos Comerciais,Gestão de Scouter,Criado,Valor por Fichas"
```

## 2. Configuração no Google Sheets

### 2.1 Estrutura da Planilha
Certifique-se que sua planilha tem a aba `Fichas` com as colunas:
- **ID**: Identificador único (texto)
- **Projetos Comerciais**: Nome do projeto
- **Gestão de Scouter**: Nome do scouter
- **Criado**: Data no formato DD/MM/AAAA
- **Valor por Fichas**: Valor monetário (ex: R$ 6,00)

### 2.2 Criar Apps Script
1. Acesse **Extensões > Apps Script**
2. Cole o código fornecido no README.md
3. Configure as constantes:
   ```javascript
   const EDGE_FUNCTION_URL = 'https://SEU_PROJETO.supabase.co/functions/v1/sheets-upsert';
   const SHARED_SECRET = 'o_mesmo_segredo_do_supabase';
   ```

### 2.3 Configurar Triggers
1. No Apps Script, vá em **Triggers** (ícone do despertador)
2. Adicione trigger para `onEdit`:
   - Função: `onEdit`
   - Evento: `On edit`
   - Falha: Email de notificação
3. Adicione trigger para `onOpen`:
   - Função: `onOpen`
   - Evento: `On open`

## 3. Teste da Sincronização

### 3.1 Teste Manual
1. Edite uma célula na planilha
2. Verifique os logs no Apps Script (**Execuções**)
3. Confirme no Supabase que os dados foram sincronizados

### 3.2 Teste em Lote
1. Use o menu **Sync > Sincronizar tudo**
2. Verifique que todas as fichas foram sincronizadas

## 4. Ativação no Sistema

### 4.1 Alternar Fonte de Dados
No arquivo `src/repositories/sourceSelector.ts`:
```typescript
export const DATA_SOURCE: "supabase" | "sheets" = "supabase";
```

### 4.2 Verificar Integração
- Dashboard deve mostrar dados do Supabase
- Filtros devem funcionar corretamente
- Performance deve estar adequada

## 5. Monitoramento

### 5.1 Logs do Apps Script
- Monitore execuções automáticas
- Verifique erros de conectividade
- Confirme frequência de sync

### 5.2 Logs do Supabase
- Edge Function logs
- Database queries
- Performance metrics

## 6. Troubleshooting

### Erro 403 (Forbidden)
- Verificar se SHARED_SECRET está correto
- Confirmar que Edge Function foi deployed

### Erro 500 (Internal Server Error)
- Verificar estrutura dos dados enviados
- Confirmar que SERVICE_ROLE_KEY tem permissões
- Validar formato das colunas

### Sincronização não funcionando
- Confirmar que triggers estão ativos
- Verificar se planilha tem aba 'Fichas'
- Testar conectividade manualmente

### Performance lenta
- Considerar aumentar batch size na Edge Function
- Otimizar queries no repository
- Implementar cache se necessário

## 7. Backup e Recuperação

### 7.1 Backup Manual
Sempre mantenha backup da planilha original antes de ativar sync automático.

### 7.2 Recuperação
Em caso de problemas:
1. Desative os triggers
2. Restaure dados do backup
3. Investigue logs
4. Corrija problema
5. Reative sincronização

## 8. Considerações de Segurança

- SHARED_SECRET deve ser único e forte
- SERVICE_ROLE_KEY nunca deve ser exposta no frontend
- Planilha deve ter permissões adequadas
- Considere rate limiting se necessário