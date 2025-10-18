#!/bin/bash

# ============================================================================
# Script de Deploy: Sincronização Bidirecional
# ============================================================================
# Este script automatiza o deploy das Edge Functions necessárias para
# sincronização bidirecional entre Gestão Scouter e TabuladorMax.
#
# Uso: ./scripts/deploy-sync-functions.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_REF="ngestyxtopvfeyenyvgt"

# Functions to deploy
FUNCTIONS=(
  "webhook-receiver"
  "tabulador-webhook"
  "tabulador-export"
  "process-sync-queue"
  "sync-tabulador"
)

echo "============================================================================"
echo "Deploy de Edge Functions - Sincronização Bidirecional"
echo "============================================================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado!${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI encontrado${NC}"
echo ""

# Check if user is logged in
echo "Verificando autenticação..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Não autenticado. Fazendo login...${NC}"
    supabase login
fi

echo -e "${GREEN}✅ Autenticado no Supabase${NC}"
echo ""

# Link to project
echo "Linkando ao projeto $PROJECT_REF..."
supabase link --project-ref $PROJECT_REF || {
    echo -e "${YELLOW}⚠️  Projeto já linkado ou erro ao linkar. Continuando...${NC}"
}
echo ""

# Deploy each function
echo "Iniciando deploy das Edge Functions..."
echo ""

for func in "${FUNCTIONS[@]}"; do
    echo "============================================================================"
    echo "Deploying: $func"
    echo "============================================================================"
    
    if [ -d "supabase/functions/$func" ]; then
        echo -e "${YELLOW}📦 Fazendo deploy de $func...${NC}"
        
        if supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt; then
            echo -e "${GREEN}✅ $func deployed com sucesso!${NC}"
        else
            echo -e "${RED}❌ Erro ao fazer deploy de $func${NC}"
            echo -e "${YELLOW}Continuando com as próximas funções...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Diretório supabase/functions/$func não encontrado. Pulando...${NC}"
    fi
    
    echo ""
done

echo "============================================================================"
echo "Deploy Concluído!"
echo "============================================================================"
echo ""
echo -e "${GREEN}Próximos passos:${NC}"
echo "1. Configure os Secrets nas Edge Functions:"
echo "   Dashboard → Edge Functions → Secrets"
echo "   "
echo "   Secrets necessários:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - TABULADOR_URL"
echo "   - TABULADOR_SERVICE_KEY"
echo "   - GESTAO_API_KEY (opcional)"
echo "   - TABULADOR_API_KEY (opcional)"
echo ""
echo "2. Verifique os logs das funções:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo ""
echo "3. Configure os triggers no TabuladorMax:"
echo "   Execute: supabase/functions/trigger_sync_leads_to_fichas.sql"
echo ""
echo "4. Configure o cron job para process-sync-queue"
echo "   Ver: DEPLOYMENT_SYNC_BIDIRECTIONAL.md (Etapa 5)"
echo ""
echo "5. Teste a sincronização:"
echo "   Execute: scripts/verify-sync-setup.sql (Gestão Scouter)"
echo "   Execute: scripts/verify-tabulador-triggers.sql (TabuladorMax)"
echo ""
echo "============================================================================"
echo "Guia completo: DEPLOYMENT_SYNC_BIDIRECTIONAL.md"
echo "============================================================================"
