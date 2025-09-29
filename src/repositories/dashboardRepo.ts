// Onde calcular totais/valores na Análise/Dashboard, garantir que a soma use getValorFichaFromRow(row).
import { getValorFichaFromRow } from '@/utils/values';
import { GoogleSheetsService } from '@/services/googleSheetsService';

export async function getDashboardData(filters: { start?: string; end?: string; scouter?: string; projeto?: string }) {
  // Busca sem filtros para evitar libs que ignoram parcial e retornam vazio
  const rows = await GoogleSheetsService.fetchFichas();
  const s = filters.scouter?.toUpperCase();
  const p = filters.projeto?.toUpperCase();
  return rows.filter((r: any) => {
    const iso = (r.criado ?? r["Criado"] ?? r["Data_criacao_Ficha"] ?? r["Data"] ?? "").slice(0,10);
    // Só filtra se a borda existir — assim evitamos "tela vazia"
    if (filters.start && iso && iso < filters.start) return false;
    if (filters.end && iso && iso > filters.end) return false;
    if (s && (String(r["Gestão de Scouter"] ?? r["Scouter"] ?? r["Gestão do Scouter"] ?? "").toUpperCase() !== s)) return false;
    if (p && (String(r["Projetos Cormeciais"] ?? r["Projetos Comerciais"] ?? r["Projetos"] ?? r["Projeto"] ?? "").toUpperCase() !== p)) return false;
    return true;
  });

  // Ao agregar:
  // const valorTotal = rows.reduce((acc, r) => acc + getValorFichaFromRow(r), 0);
  // Evitar reparse de string na camada de UI.
}