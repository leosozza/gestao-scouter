# Quick Setup: gestao_scouter_config Table

## ⚡ Configuração Rápida (5 minutos)

Este é um guia resumido para criar a tabela `gestao_scouter_config` no TabuladorMax. Para instruções detalhadas, consulte [TABULADORMAX_CONFIG_TABLE_SETUP.md](./TABULADORMAX_CONFIG_TABLE_SETUP.md).

## 🎯 Objetivo

Criar a tabela `gestao_scouter_config` no Supabase do TabuladorMax para eliminar o erro 404 ao salvar configurações de integração.

## 📝 Passos Rápidos

### 1. Obter a Anon Key do Gestão Scouter

Acesse: https://supabase.com/dashboard/project/ngestyxtopvfeyenyvgt/settings/api

Copie a **anon/public key** (começa com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2. Executar SQL no TabuladorMax

1. Acesse: https://supabase.com/dashboard/project/gkvvtfqfggddzotxltxf/sql/new

2. Abra o arquivo: `supabase/migrations/tabuladormax_gestao_scouter_config.sql`

3. Copie TODO o conteúdo

4. **IMPORTANTE**: Localize esta linha no final do arquivo:
   ```sql
   'sua_anon_key_aqui',  -- Substitua pela anon key real
   ```

5. Substitua `'sua_anon_key_aqui'` pela anon key copiada no passo 1

6. Cole no SQL Editor e clique em **Run**

### 3. Verificar

Execute no SQL Editor:
```sql
SELECT id, project_url, active, sync_enabled 
FROM public.gestao_scouter_config;
```

✅ **Sucesso!** Você deve ver 1 registro com:
- `project_url`: https://ngestyxtopvfeyenyvgt.supabase.co
- `active`: true
- `sync_enabled`: false

## 🐛 Solução de Problemas Rápidos

### Erro: "permission denied"
→ Você precisa de permissões de admin no projeto TabuladorMax

### Erro: "relation already exists"
→ A tabela já existe, tudo certo! Apenas execute o SELECT do passo 3

### SELECT retorna vazio
→ Execute manualmente:
```sql
INSERT INTO public.gestao_scouter_config (project_url, anon_key, active, sync_enabled)
VALUES (
  'https://ngestyxtopvfeyenyvgt.supabase.co',
  'cole_sua_anon_key_aqui',
  true,
  false
);
```

## 📚 Estrutura da Tabela

```sql
CREATE TABLE gestao_scouter_config (
  id serial PRIMARY KEY,
  project_url text NOT NULL,           -- URL do Gestão Scouter
  anon_key text NOT NULL,              -- Anon key do Gestão Scouter
  active boolean DEFAULT true,         -- Config ativa?
  sync_enabled boolean DEFAULT false,  -- Sync automático habilitado?
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 🔐 RLS Policies

✅ SELECT: Todos podem ler
✅ INSERT: Apenas autenticados
✅ UPDATE: Apenas autenticados  
✅ DELETE: Apenas autenticados

## ✅ Checklist

- [ ] Anon key do Gestão Scouter obtida
- [ ] SQL executado no TabuladorMax sem erros
- [ ] SELECT retorna 1 registro
- [ ] `active = true`
- [ ] `project_url` correto

## 🎓 Próximos Passos

1. Habilitar sync automático:
   ```sql
   UPDATE public.gestao_scouter_config
   SET sync_enabled = true
   WHERE active = true;
   ```

2. Consultar documentação completa: [TABULADORMAX_CONFIG_TABLE_SETUP.md](./TABULADORMAX_CONFIG_TABLE_SETUP.md)

3. Verificar logs de sincronização no Supabase Dashboard

---

**Tempo estimado**: 5 minutos
**Dificuldade**: Fácil ⭐
