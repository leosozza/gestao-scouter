# Scripts de Migração e Sincronização

Este diretório contém scripts para sincronização e migração de dados entre os projetos TabuladorMax e Gestão Scouter.

## 📁 Arquivos

### `syncLeadsToFichas.ts`

Script principal de migração inicial que copia todos os registros da tabela `leads` (TabuladorMax) para a tabela `fichas` (Gestão Scouter).

**Funcionalidades:**
- ✅ Busca todos os leads da origem
- ✅ Normaliza tipos de dados (especialmente datas)
- ✅ Processa em lotes de 1000 registros
- ✅ Backup JSON completo no campo `raw`
- ✅ Retry automático em caso de erro
- ✅ Progress bar em tempo real
- ✅ Relatório final com estatísticas

**Pré-requisitos:**

1. Variáveis de ambiente configuradas no `.env`:
   ```env
   TABULADOR_URL=https://gkvvtfqfggddzotxltxf.supabase.co
   TABULADOR_SERVICE_KEY=sua_service_role_key_tabulador
   VITE_SUPABASE_URL=https://ngestyxtopvfeyenyvgt.supabase.co
   VITE_SUPABASE_SERVICE_KEY=sua_service_role_key_gestao
   ```

2. Dependências instaladas:
   ```bash
   npm install
   ```

**Uso:**

```bash
# Usando npm script (recomendado)
npm run migrate:leads

# Ou diretamente
npx tsx scripts/syncLeadsToFichas.ts
```

**Exemplo de Saída:**

```
🚀 Iniciando migração de Leads → Fichas
================================================================================
✅ Clientes Supabase configurados
   TabuladorMax: https://gkvvtfqfggddzotxltxf.supabase.co
   Gestão Scouter: https://ngestyxtopvfeyenyvgt.supabase.co

📥 Buscando leads da tabela de origem...
✅ Total de 207000 leads encontrados

🔄 Iniciando processamento em lotes...

📊 Progresso: 207000/207000 (100.0%) | ✅ Inseridos: 207000 | ❌ Erros: 0
================================================================================
✅ MIGRAÇÃO CONCLUÍDA

📊 Estatísticas:
   Total de leads: 207000
   Processados: 207000
   Inseridos/Atualizados: 207000
   Erros: 0
   Taxa de sucesso: 100.00%
   Tempo total: 82.8s
   Taxa média: 2500.0 registros/s
================================================================================
```

### `testMigration.ts`

Script de teste e validação da função de normalização de dados.

**Funcionalidades:**
- ✅ Testa normalização de lead completo
- ✅ Testa normalização de lead mínimo
- ✅ Testa conversão de datas
- ✅ Testa conversão de tipos
- ✅ Valida backup JSON no campo `raw`

**Uso:**

```bash
npx tsx scripts/testMigration.ts
```

## 🔧 Mapeamento de Campos

| Campo Lead (origem)   | Campo Ficha (destino) | Tipo       | Observações                    |
|----------------------|----------------------|------------|--------------------------------|
| id                   | id                   | string     | Convertido para string         |
| nome                 | nome                 | string     | -                              |
| telefone             | telefone             | string     | -                              |
| email                | email                | string     | -                              |
| idade                | idade                | string     | Sempre convertido para string  |
| projeto              | projeto              | string     | -                              |
| scouter              | scouter              | string     | -                              |
| supervisor           | supervisor           | string     | -                              |
| localizacao          | localizacao          | string     | -                              |
| latitude             | latitude             | number     | -                              |
| longitude            | longitude            | number     | -                              |
| local_da_abordagem   | local_da_abordagem   | string     | -                              |
| criado               | criado               | string     | Normalizado para YYYY-MM-DD    |
| valor_ficha          | valor_ficha          | number     | -                              |
| etapa                | etapa                | string     | -                              |
| ficha_confirmada     | ficha_confirmada     | string     | -                              |
| foto                 | foto                 | string     | -                              |
| *todos*              | raw                  | jsonb      | Backup JSON completo           |
| updated_at           | updated_at           | timestamp  | Mantido ou gerado              |
| -                    | deleted              | boolean    | Sempre false na migração       |

## 📝 Notas

### Segurança
- ⚠️ Nunca commite o arquivo `.env` com credenciais reais
- ⚠️ Use service role keys apenas em scripts server-side
- ⚠️ Mantenha as credenciais em variáveis de ambiente

### Performance
- O script processa em lotes de 1000 registros
- Taxa média esperada: 2000-3000 registros/segundo
- Para 200k registros: ~80-100 segundos

### Tratamento de Erros
- Retry automático (3 tentativas) em caso de erro de rede
- Delay exponencial entre tentativas
- Estatísticas de erros no relatório final

### Normalização de Datas
- Formatos aceitos: ISO 8601, Date objects
- Formato de saída: YYYY-MM-DD
- Datas inválidas: undefined (com warning no console)

## 🔗 Documentação Relacionada

- [README principal](../README.md) - Instruções de uso geral
- [SYNC_ARCHITECTURE.md](../SYNC_ARCHITECTURE.md) - Arquitetura de sincronização
- [Trigger SQL](../supabase/functions/trigger_sync_leads_to_fichas.sql) - Sincronização automática

## 🆘 Troubleshooting

### "Erro de configuração: TABULADOR_URL não configurada"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme que todas as variáveis estão definidas corretamente

### "Erro ao buscar leads: permission denied"
- Verifique se a service role key está correta
- Confirme que a service role key tem permissões para acessar a tabela `leads`

### "Erro ao processar lote após 3 tentativas"
- Verifique a conectividade com o Supabase
- Confirme que a tabela `fichas` existe no projeto de destino
- Verifique os logs do Supabase para mais detalhes

### Taxa de processamento muito baixa
- Verifique a latência de rede
- Considere aumentar o `BATCH_SIZE` no script (padrão: 1000)
- Verifique se há rate limiting ativo no Supabase

## 📧 Suporte

Para questões ou problemas:
1. Verifique a documentação acima
2. Consulte os logs do script para detalhes do erro
3. Verifique os logs do Supabase Dashboard
4. Abra uma issue no GitHub se o problema persistir
