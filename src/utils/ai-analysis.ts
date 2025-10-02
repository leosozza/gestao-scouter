/**
 * AI Analysis Utilities
 * Generate insights from spatial data
 */

interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
}

interface AIAnalysisResult {
  topProjetos: string[];
  topScouters: string[];
  densidade: string;
  hotspot: string;
  recomendacoes: string[];
}

/**
 * Build AI-style summary from selection (fallback/local analysis)
 * @param summary - Analysis summary with project and scouter data
 * @param centerLat - Center latitude of area
 * @param centerLng - Center longitude of area
 * @returns AI analysis result
 */
export function buildAISummaryFromSelection(
  summary: AnalysisSummary,
  centerLat?: number,
  centerLng?: number
): AIAnalysisResult {
  // Top 3 projects
  const topProjetos = summary.byProjeto
    .slice(0, 3)
    .map(p => `${p.projeto} (${p.total} fichas)`);

  // Top scouters across all projects
  const scouterTotals = new Map<string, number>();
  summary.byProjeto.forEach(proj => {
    proj.byScout.forEach((count, scouter) => {
      scouterTotals.set(scouter, (scouterTotals.get(scouter) || 0) + count);
    });
  });

  const topScouters = Array.from(scouterTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([scouter, count]) => `${scouter} (${count} fichas)`);

  // Calculate density
  const densidade = summary.total > 100 
    ? 'Alta densidade de fichas' 
    : summary.total > 30 
    ? 'Densidade moderada' 
    : 'Baixa densidade';

  // Hotspot (centroid)
  const hotspot = centerLat && centerLng 
    ? `Centro: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}` 
    : 'Centroide da área selecionada';

  // Generate recommendations
  const recomendacoes: string[] = [];
  
  if (summary.total > 100) {
    recomendacoes.push('Área de alto potencial - considere intensificar operações');
  } else if (summary.total < 10) {
    recomendacoes.push('Área com baixa cobertura - oportunidade de expansão');
  }

  if (summary.byProjeto.length > 1) {
    const topProject = summary.byProjeto[0];
    const dominance = (topProject.total / summary.total) * 100;
    if (dominance > 70) {
      recomendacoes.push(`Projeto ${topProject.projeto} domina com ${dominance.toFixed(0)}% das fichas`);
    }
  }

  if (topScouters.length > 0) {
    recomendacoes.push('Concentrar esforços nos scouters mais produtivos');
  }

  recomendacoes.push('Monitorar tendências temporais para otimização de recursos');

  return {
    topProjetos,
    topScouters,
    densidade,
    hotspot,
    recomendacoes
  };
}

/**
 * Format AI analysis as HTML
 */
export function formatAIAnalysisHTML(analysis: AIAnalysisResult): string {
  return `
    <div style="font-family: system-ui, sans-serif; padding: 16px;">
      <h3 style="margin-top: 0; color: #333;">Análise da Área</h3>
      
      <div style="margin-bottom: 16px;">
        <h4 style="color: #666; margin-bottom: 8px;">Top Projetos</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${analysis.topProjetos.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="color: #666; margin-bottom: 8px;">Top Scouters</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${analysis.topScouters.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="color: #666; margin-bottom: 8px;">Densidade</h4>
        <p style="margin: 0;">${analysis.densidade}</p>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="color: #666; margin-bottom: 8px;">Hotspot</h4>
        <p style="margin: 0;">${analysis.hotspot}</p>
      </div>

      <div>
        <h4 style="color: #666; margin-bottom: 8px;">Recomendações</h4>
        <ul style="margin: 0; padding-left: 20px;">
          ${analysis.recomendacoes.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}
