
export type AjudaCustoConfig = {
  proxima: number;      // Seletivas próximas
  longe: number;        // Seletivas longe
  folgaLonge: number;   // Folga remunerada para seletivas longe
};

const STORAGE_KEY = 'ajudaCustoConfig';

const DEFAULTS: AjudaCustoConfig = {
  proxima: 30,
  longe: 70,
  folgaLonge: 50,
};

export const getAjudaCustoConfig = (): AjudaCustoConfig => {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      proxima: Number(parsed.proxima ?? DEFAULTS.proxima),
      longe: Number(parsed.longe ?? DEFAULTS.longe),
      folgaLonge: Number(parsed.folgaLonge ?? DEFAULTS.folgaLonge),
    };
  } catch {
    return DEFAULTS;
  }
};

export const setAjudaCustoConfig = (cfg: Partial<AjudaCustoConfig>) => {
  if (typeof window === 'undefined') return;
  const current = getAjudaCustoConfig();
  const merged: AjudaCustoConfig = {
    proxima: Number(cfg.proxima ?? current.proxima),
    longe: Number(cfg.longe ?? current.longe),
    folgaLonge: Number(cfg.folgaLonge ?? current.folgaLonge),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
};

