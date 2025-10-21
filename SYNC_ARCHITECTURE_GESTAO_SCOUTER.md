# Arquitetura de Sincronização: TabuladorMax ↔ Gestão Scouter

## ✅ Fluxo Atual (PUSH Unidirecional)

### TabuladorMax → Gestão Scouter
- **Edge Function:** `export-to-gestao-scouter-batch`
- **Origem:** TabuladorMax tabela `leads`
- **Destino:** Gestão Scouter tabela `leads`
- **Método:** PUSH via Service Role Key
- **Interface:** Sync Monitor no TabuladorMax

### O que o Gestão Scouter precisa?
1. ✅ Tabela `public.leads` com 49 campos (já existe)
2. ✅ RLS policies configuradas (já existe)
3. ❌ **NENHUMA Edge Function necessária**

## ❌ O que NÃO é necessário

### Edge Functions que NÃO precisam ser criadas:
- `get-leads-count` - DESNECESSÁRIA
- `get-leads-for-sync` - DESNECESSÁRIA

**Por quê?** O TabuladorMax faz PUSH direto para a tabela `leads` do Gestão Scouter via REST API usando Service Role Key. Não há necessidade de Edge Functions no Gestão Scouter para receber dados.

## 🔧 Setup Necessário

### No Gestão Scouter (já configurado):
```sql
-- Tabela leads com schema completo (49 campos)
-- RLS Policy para permitir acesso via service_role
CREATE POLICY "Allow service_role full access"
ON public.leads FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### No TabuladorMax (já configurado):
- Credenciais do Gestão Scouter (URL + Service Key)
- Edge Function `export-to-gestao-scouter-batch`
- Mapeamento de campos
- Interface de monitoramento

## 📊 Como Funciona

```
┌─────────────────┐
│  TabuladorMax   │
│                 │
│  Edge Function: │
│  export-to-     │
│  gestao-scouter │
│  -batch         │
└────────┬────────┘
         │
         │ POST https://jstsrgyxrrlklnzgsihd.supabase.co/rest/v1/leads
         │ Authorization: Bearer [SERVICE_ROLE_KEY]
         │ Content-Type: application/json
         │ Prefer: resolution=merge-duplicates
         │ Body: [{...leads...}]
         │
         ▼
┌─────────────────┐
│ Gestão Scouter  │
│                 │
│ RLS permite     │
│ service_role    │
│                 │
│ INSERT/UPDATE   │
│ tabela leads    │
└─────────────────┘
```

## 🔄 Sincronização Bidirecional (Opcional)

### TabuladorMax ← Gestão Scouter (Webhook Reverso)

**⚠️ Importante:** Este fluxo reverso é **OPCIONAL** e atualmente **NÃO ESTÁ IMPLEMENTADO** no Gestão Scouter.

Para habilitar sincronização reversa (Gestão → TabuladorMax):

1. **No TabuladorMax**: Edge Function `sync-from-gestao-scouter` (já existe)
2. **No Gestão Scouter**: Criar trigger para chamar webhook (não existe)

```sql
-- Trigger necessário no Gestão Scouter (NÃO IMPLEMENTADO)
CREATE OR REPLACE FUNCTION notify_tabulador_on_lead_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Chama webhook do TabuladorMax
  PERFORM net.http_post(
    'https://[tabulador-url]/functions/v1/sync-from-gestao-scouter',
    jsonb_build_object(
      'operation', TG_OP,
      'lead', row_to_json(NEW)
    ),
    headers := jsonb_build_object(
      'Authorization', 'Bearer [service-key]',
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_to_tabulador
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION notify_tabulador_on_lead_change();
```

**Status atual:** Sincronização reversa **NÃO CONFIGURADA** - apenas o fluxo TabuladorMax → Gestão Scouter está ativo.

## 🚨 Erros Comuns

### "get-leads-count não encontrada"
**Causa:** Código antigo tentava chamar essa função do TabuladorMax.  
**Solução:** ✅ Removida do código (não é necessária).

### "get-leads-for-sync não encontrada"
**Causa:** Código antigo tentava chamar essa função do TabuladorMax.  
**Solução:** ✅ Removida do código (não é necessária).

### "Connection failed"
**Causa:** Credenciais incorretas ou RLS bloqueando.  
**Solução:** 
1. Verificar Service Role Key no TabuladorMax
2. Verificar URL do Gestão Scouter
3. Confirmar RLS policies na tabela `leads`

### "Schema mismatch" ao exportar
**Causa:** Campos faltando na tabela `leads` do Gestão Scouter.  
**Solução:**
1. No TabuladorMax, clique em "Validar Schema"
2. Copie o SQL sugerido
3. Execute no SQL Editor do Gestão Scouter
4. Aguarde 30 segundos para cache atualizar
5. Clique novamente em "Validar Schema"

## 📝 Histórico de Decisões

### Por que PUSH e não PULL?
- ✅ TabuladorMax é a fonte da verdade
- ✅ Gestão Scouter é dashboard de visualização
- ✅ PUSH é mais simples e confiável
- ✅ Menos pontos de falha
- ✅ Não precisa Edge Functions no Gestão Scouter

### Por que não Edge Functions no Gestão Scouter?
- ✅ TabuladorMax acessa REST API diretamente
- ✅ Service Role Key tem acesso total via RLS
- ✅ Edge Functions seriam redundantes
- ✅ Arquitetura mais simples = mais confiável

### Por que sincronização reversa não está implementada?
- ✅ Não há necessidade atual de editar leads no Gestão Scouter
- ✅ Gestão Scouter é primariamente um dashboard de visualização
- ✅ Reduz complexidade e riscos de loops infinitos
- ✅ Pode ser implementada no futuro se necessário

## 🔍 Monitoramento

### No TabuladorMax (Sync Monitor):
- Status da última exportação
- Total de leads exportados
- Erros e logs detalhados
- Validação de schema
- Testes de conexão

### No Gestão Scouter:
- Dashboard exibe leads sincronizados automaticamente
- Nenhuma configuração adicional necessária
- Dados aparecem assim que são enviados do TabuladorMax

## 📚 Documentação Relacionada

- [README.md](./README.md) - Visão geral do projeto
- [LEADS_DATA_SOURCE.md](./LEADS_DATA_SOURCE.md) - Arquitetura de dados
- [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) - Importação massiva
- Documentação do TabuladorMax: `GESTAO_SCOUTER_EXPORT_GUIDE.md`

---

**Última atualização:** 2025-10-21  
**Status:** ✅ Arquitetura simplificada e funcional
