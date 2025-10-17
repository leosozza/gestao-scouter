#!/bin/bash
# Script de Verificação da Centralização da Tabela 'fichas'
# =========================================================
# Este script valida que a aplicação está usando exclusivamente
# a tabela 'fichas' como fonte de dados.

echo "🔍 Verificando centralização da tabela 'fichas'..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASS=0
FAIL=0
WARN=0

# 1. Verificar se há queries para tabelas legadas em código de produção
echo "1️⃣  Verificando queries de tabelas legadas..."
LEGACY_QUERIES=$(grep -r "\.from('leads')" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|mock\|example" | wc -l)
if [ "$LEGACY_QUERIES" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhuma query para tabela 'leads' encontrada${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Encontradas $LEGACY_QUERIES queries para tabela 'leads'${NC}"
    ((FAIL++))
fi

BITRIX_QUERIES=$(grep -r "\.from('bitrix_leads')" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "test\|mock\|example" | wc -l)
if [ "$BITRIX_QUERIES" -eq 0 ]; then
    echo -e "${GREEN}✅ Nenhuma query para tabela 'bitrix_leads' encontrada${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Encontradas $BITRIX_QUERIES queries para tabela 'bitrix_leads'${NC}"
    ((FAIL++))
fi

# 2. Verificar queries corretas para 'fichas'
echo ""
echo "2️⃣  Verificando queries para tabela 'fichas'..."
FICHAS_QUERIES=$(grep -r "\.from('fichas')" src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
if [ "$FICHAS_QUERIES" -gt 0 ]; then
    echo -e "${GREEN}✅ Encontradas $FICHAS_QUERIES queries para tabela 'fichas'${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Nenhuma query para tabela 'fichas' encontrada${NC}"
    ((FAIL++))
fi

# 3. Verificar documentação
echo ""
echo "3️⃣  Verificando documentação..."
if [ -f "LEADS_DATA_SOURCE.md" ]; then
    echo -e "${GREEN}✅ LEADS_DATA_SOURCE.md existe${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ LEADS_DATA_SOURCE.md não encontrado${NC}"
    ((FAIL++))
fi

if [ -f "CENTRALIZACAO_FICHAS_SUMMARY.md" ]; then
    echo -e "${GREEN}✅ CENTRALIZACAO_FICHAS_SUMMARY.md existe${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ CENTRALIZACAO_FICHAS_SUMMARY.md não encontrado${NC}"
    ((FAIL++))
fi

# 4. Verificar alertas em arquivos críticos
echo ""
echo "4️⃣  Verificando alertas em arquivos críticos..."

FILES_TO_CHECK=("src/hooks/useFichas.ts" "src/repositories/leadsRepo.ts" "src/services/mockDataService.ts")
for file in "${FILES_TO_CHECK[@]}"; do
    if grep -q "FONTE ÚNICA\|fonte única\|ATENÇÃO" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅ $file contém alertas${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️  $file não contém alertas${NC}"
        ((WARN++))
    fi
done

# 5. Verificar build
echo ""
echo "5️⃣  Verificando build..."
if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✅ Build executado com sucesso${NC}"
    ((PASS++))
else
    echo -e "${RED}❌ Build falhou - verificar /tmp/build.log${NC}"
    ((FAIL++))
fi

# 6. Verificar imports de MockDataService em produção
echo ""
echo "6️⃣  Verificando imports de MockDataService..."
MOCK_IMPORTS=$(grep -r "import.*MockDataService\|from.*mockDataService" src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "src/services/mockDataService.ts\|src/data/mockData.ts" | wc -l)
if [ "$MOCK_IMPORTS" -eq 0 ]; then
    echo -e "${GREEN}✅ MockDataService não está sendo importado em código de produção${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}⚠️  Encontrados $MOCK_IMPORTS imports de MockDataService${NC}"
    ((WARN++))
fi

# Resultado final
echo ""
echo "================================================"
echo "📊 RESULTADO DA VERIFICAÇÃO"
echo "================================================"
echo -e "${GREEN}✅ Passou: $PASS${NC}"
if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}❌ Falhou: $FAIL${NC}"
fi
if [ "$WARN" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Avisos: $WARN${NC}"
fi
echo ""

# Status final
if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✨ VERIFICAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
    echo "A aplicação está usando a tabela 'fichas' como fonte única de verdade."
    exit 0
else
    echo -e "${RED}❌ VERIFICAÇÃO FALHOU!${NC}"
    echo "Existem problemas que precisam ser corrigidos."
    exit 1
fi
