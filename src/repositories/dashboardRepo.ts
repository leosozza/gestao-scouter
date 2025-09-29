import { GoogleSheetsService } from "@/services/googleSheetsService";
import { normalizeUpper } from "@/utils/normalize";

export async function getDashboardData(filters: { start?: string; end?: string; scouter?: string; projeto?: string }) {
  // sempre puxa "fresco" quando filtros mudam (TTL de 30s protege)
  const rows = await GoogleSheetsService.fetchFichas();
  const s = filters.scouter ? normalizeUpper(filters.scouter) : undefined;
  const p = filters.projeto ? normalizeUpper(filters.projeto) : undefined;
  return rows.filter((r: any) => {
    const iso = (r.criado ?? r["Criado"] ?? r["Data_criacao_Ficha"] ?? r["Data"] ?? "").slice(0,10);
    // Só filtra se a borda existir — assim evitamos "tela vazia"
    if (filters.start && iso && iso < filters.start) return false;
    if (filters.end && iso && iso > filters.end) return false;
    if (s && normalizeUpper(r["Gestão de Scouter"] ?? r["Scouter"] ?? r["Gestão do Scouter"] ?? "") !== s) return false;
    if (p && normalizeUpper(r["Projetos Cormeciais"] ?? r["Projetos Comerciais"] ?? r["Projetos"] ?? r["Projeto"] ?? "") !== p) return false;
    return true;
  });
}