// Se já existir parseFichaValue no projeto, mantenha e remova esta versão.
export const parseFichaValue = (raw: unknown): number => {
  if (raw == null) return 0;
  const str = String(raw).replace(/[R$\s.]/g, "").replace(",", ".");
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
};

export const getValorFichaFromRow = (row: Record<string, unknown>): number => {
  const candidatos = [
    "Valor por Fichas",
    "Valor Ficha", 
    "Valor_ficha",
    "R$/Ficha",
    "Valor da Ficha",
    "Valor por Ficha",
  ];
  for (const k of candidatos) {
    const v = row?.[k];
    const parsed = parseFichaValue(v);
    if (parsed > 0) return parsed;
  }
  return 0;
};