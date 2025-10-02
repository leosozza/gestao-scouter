// Utility to generate a stable hash for the current selection summary
// (Used for potential caching and history isolation)

export interface SelectionSummaryLite {
  total: number;
  byProjeto: { projeto: string; total: number }[];
}

export function hashSelection(summary: SelectionSummaryLite): string {
  const base = [
    summary.total,
    ...summary.byProjeto
      .slice(0, 16) // limit to first 16 projects to constrain size
      .map(p => `${p.projeto}:${p.total}`)
  ].join('|');

  // Simple FNV-1a hash for deterministic short hash (fallback if crypto not available)
  let h = 0x811c9dc5; for (let i = 0; i < base.length; i++) { h ^= base.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}