// Local fallback answer builder for area Q&A (heuristic, no external LLM)
// Future: replace or augment with provider-based generation when API keys are configured.

interface ProjetoItem { nome: string; total: number }
interface ScouterItem { nome: string; total: number }

export interface AIContext {
  total: number;
  projetos: ProjetoItem[];
  topScouters: ScouterItem[];
  center?: { lat: number; lng: number };
}

export function buildLocalAnswer(question: string, ctx: AIContext): string {
  const q = (question || '').trim();
  const topProjeto = ctx.projetos[0];
  const diversidade = ctx.projetos.length > 7 ? 'alta diversidade' : ctx.projetos.length > 3 ? 'diversidade moderada' : 'baixa diversidade';
  const densidade = ctx.total > 150 ? 'alta densidade' : ctx.total > 60 ? 'densidade moderada' : 'densidade baixa';
  const scouterResumo = ctx.topScouters.slice(0,3).map(s => `${s.nome} (${s.total})`).join(', ') || 'Sem scouters dominantes';
  const centro = ctx.center ? `Centro aproximado: (${ctx.center.lat.toFixed(4)}, ${ctx.center.lng.toFixed(4)})` : '';

  const recomenda: string[] = [];
  if (ctx.total < 20) recomenda.push('Expandir cobertura para aumentar base de fichas');
  if (ctx.total > 200) recomenda.push('Priorizar qualificação e triagem devido ao alto volume');
  if (topProjeto && topProjeto.total / ctx.total > 0.6) recomenda.push(`Diversificar além de ${topProjeto.nome}`);
  if (ctx.topScouters.length > 0) recomenda.push('Incentivar compartilhamento de boas práticas entre scouters');
  recomenda.push('Monitorar evolução temporal para identificar tendência precoce');

  let foco: string;
  if (/scout|scouter|quem/i.test(q)) foco = `Principais scouters: ${scouterResumo}.`;
  else if (/densidade|concentração|lotação|denso/i.test(q)) foco = `A área apresenta ${densidade} considerando ${ctx.total} fichas.`;
  else if (/projeto|projetos|mix/i.test(q)) foco = `Projetos principais: ${ctx.projetos.slice(0,5).map(p=>`${p.nome} (${p.total})`).join(', ')}.`;
  else if (/recomend|sugest/i.test(q)) foco = `Recomendações chave: ${recomenda.slice(0,3).join(' | ')}`;
  else foco = `Resumo: ${ctx.total} fichas, ${ctx.projetos.length} projetos (${diversidade}), ${densidade}.`;

  return [foco, centro, recomenda.length ? 'Recomendações: ' + recomenda.join(' | ') : null]
    .filter(Boolean)
    .join('\n');
}

// Simple guard for potential future provider extension
export function buildAnswer(question: string, ctx: AIContext, provider?: string): string {
  // Placeholder: when provider keys exist, branch logic here.
  return buildLocalAnswer(question, ctx);
}