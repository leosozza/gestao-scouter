import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadsFilters } from './types';

// fonte atual (ajuste se você já tem outro lugar)
function getDataSource(): 'bitrix' | 'sheets' { 
  const STORAGE_KEY = 'gestao-scouter.datasource';
  if (typeof window === 'undefined') return 'sheets';
  return (localStorage.getItem(STORAGE_KEY) as 'bitrix' | 'sheets') || 'sheets';
}

/** API PÚBLICA */
export async function getLeads(params: LeadsFilters = {}): Promise<Lead[]> {
  const ds = getDataSource();
  return ds === 'bitrix'
    ? fetchAllLeadsFromBitrix(params)
    : fetchAllLeadsFromSheets(params);
}

export interface LeadsSummary {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalValue: number;
}

export async function getLeadsSummary(params: LeadsFilters = {}): Promise<LeadsSummary> {
  const leads = await getLeads(params);
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.etapa === 'Convertido' || l.ficha_confirmada === 'Sim').length;
  const totalValue = leads.reduce((s, l) => s + (l.valor_ficha || 0), 0);
  return {
    totalLeads,
    convertedLeads,
    conversionRate: totalLeads ? (convertedLeads / totalLeads) * 100 : 0,
    totalValue,
  };
}

export async function getLeadsByScouter(params: LeadsFilters = {}): Promise<
  { scouter: string; leads: number; converted: number; conversionRate: number; value: number }[]
> {
  const leads = await getLeads(params);
  const map = new Map<string, { leads: number; converted: number; value: number }>();
  for (const l of leads) {
    const key = l.scouter || '—';
    if (!map.has(key)) map.set(key, { leads: 0, converted: 0, value: 0 });
    const s = map.get(key)!;
    s.leads++;
    s.value += l.valor_ficha || 0;
    if (l.etapa === 'Convertido' || l.ficha_confirmada === 'Sim') s.converted++;
  }
  return [...map].map(([scouter, s]) => ({
    scouter,
    leads: s.leads,
    converted: s.converted,
    conversionRate: s.leads ? (s.converted / s.leads) * 100 : 0,
    value: s.value,
  }));
}

export async function getLeadsByProject(params: LeadsFilters = {}): Promise<
  { project: string; leads: number; converted: number; conversionRate: number; value: number }[]
> {
  const leads = await getLeads(params);
  const map = new Map<string, { leads: number; converted: number; value: number }>();
  for (const l of leads) {
    const key = l.projetos || '—';
    if (!map.has(key)) map.set(key, { leads: 0, converted: 0, value: 0 });
    const s = map.get(key)!;
    s.leads++;
    s.value += l.valor_ficha || 0;
    if (l.etapa === 'Convertido' || l.ficha_confirmada === 'Sim') s.converted++;
  }
  return [...map].map(([project, s]) => ({
    project,
    leads: s.leads,
    converted: s.converted,
    conversionRate: s.leads ? (s.converted / s.leads) * 100 : 0,
    value: s.value,
  }));
}

/** BITRIX (Supabase) */
async function fetchAllLeadsFromBitrix(params: LeadsFilters): Promise<Lead[]> {
  let q = supabase.from('bitrix_leads').select('*');

  // ⚠️ Colunas prováveis (ajuste se o seu schema usar outros nomes)
  if (params.dataInicio) q = q.gte('data_de_criacao_da_ficha', params.dataInicio);
  if (params.dataFim)    q = q.lte('data_de_criacao_da_ficha', params.dataFim);
  if (params.etapa)      q = q.eq('etapa', params.etapa);

  // se existirem colunas específicas para scouter/projeto, aplique:
  if (params.scouter)    q = q.ilike('primeiro_nome', `%${params.scouter}%`);
  if (params.projeto)    q = q.ilike('projetos_comerciais', `%${params.projeto}%`);

  const { data, error } = await q;
  if (error) {
    console.error('Bitrix query error', error);
    return [];
  }
  return (data ?? []).map(normalizeLeadFromBitrix)
    .filter(l => applyClientSideFilters(l, params));
}

function normalizeLeadFromBitrix(r: any): Lead {
  return {
    id: String(r.id ?? ''),
    projetos: r.projetos_comerciais ?? r.agencia_e_seletivas ?? 'Sem Projeto',
    scouter: r.primeiro_nome ?? r.nome_do_modelo ?? 'Desconhecido',
    criado: r.created_at ?? undefined,
    data_criacao_ficha: r.data_de_criacao_da_ficha ?? r.created_at ?? undefined,
    valor_ficha: safeNumber(r.valor_da_ficha),
    etapa: r.etapa ?? 'Sem Etapa',
    nome: r.nome_do_responsavel ?? r.primeiro_nome ?? 'Sem nome',
    gerenciamentofunil: r.gerenciamentofunil ?? r.gerenciamento_funil ?? undefined,
    etapafunil: r.etapafunil ?? r.etapa_funil ?? undefined,
    modelo: r.nome_do_modelo ?? r.primeiro_nome ?? '',
    localizacao: r.localizacao ?? undefined,
    ficha_confirmada: r.ficha_confirmada ?? undefined,
    idade: safeNumber(r.idade),
    local_da_abordagem: r.local_da_abordagem ?? undefined,
    cadastro_existe_foto: r.cadastro_existe_foto ?? undefined,
    presenca_confirmada: r.presenca_confirmada ?? undefined,
    supervisor_do_scouter: r.supervisor_do_scouter ?? undefined,
  };
}

/** SHEETS */
async function fetchAllLeadsFromSheets(params: LeadsFilters): Promise<Lead[]> {
  const { GoogleSheetsService } = await import('@/services/googleSheetsService');
  const fichas = await GoogleSheetsService.fetchFichas();
  const leads: Lead[] = (fichas ?? []).map(normalizeLeadFromSheets);

  // filtros client-side
  return leads.filter(l => applyClientSideFilters(l, params));
}

function normalizeLeadFromSheets(f: any, idx?: number): Lead {
  return {
    id: String(f.ID ?? (idx != null ? `ficha-${idx}` : '')),
    projetos: f.Projetos ?? f['Projetos Cormeciais'] ?? f['Agencia e Seletivas (texto)'] ?? 'Sem Projeto',
    scouter: f.Scouter ?? f['Gestão de Scouter'] ?? f['Scouter (texto)'] ?? 'Desconhecido',
    criado: toISO(f.Criado ?? f.Criado_date ?? undefined),
    data_criacao_ficha: toISO(f['Data de criação da Ficha'] ?? f.Data_criacao_Ficha ?? undefined),
    valor_ficha: safeNumber(f['Valor da Ficha'] ?? f.Valor_Ficha),
    etapa: f.Etapa ?? f['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] ?? 'Sem Etapa',
    nome: f['Nome do Responsável'] ?? f['Primeiro nome'] ?? f.Nome ?? 'Sem nome',
    gerenciamentofunil: f['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO (texto)'] ?? f.GERENCIAMENTOFUNIL ?? undefined,
    etapafunil: f['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO (texto)'] ?? f.ETAPAFUNIL ?? undefined,
    modelo: f['Nome do Modelo'] ?? f.modelo ?? '',
    localizacao: f.Localização ?? f.Localizacao ?? undefined,
    ficha_confirmada: f['Ficha confirmada'] ?? f.Ficha_confirmada ?? undefined,
    idade: safeNumber(f.Idade ?? f.Idade_num),
    local_da_abordagem: f['Local da Abordagem'] ?? f.Local_da_Abordagem ?? undefined,
    cadastro_existe_foto: f['Cadastro Existe Foto? (texto)'] ?? f['Cadastro Existe Foto?'] ?? f.Cadastro_Existe_Foto ?? undefined,
    presenca_confirmada: f['Presença Confirmada'] ?? f.Presenca_Confirmada ?? undefined,
    supervisor_do_scouter: f['Supervisor do Scouter (texto)'] ?? f['Supervisor do Scouter'] ?? f.Supervisor_do_Scouter ?? undefined,
  };
}

/** Helpers comuns */
function applyClientSideFilters(l: Lead, p: LeadsFilters): boolean {
  if (p.scouter && !l.scouter?.toLowerCase().includes(p.scouter.toLowerCase())) return false;
  if (p.projeto && !l.projetos?.toLowerCase().includes(p.projeto.toLowerCase())) return false;
  if (p.etapa && l.etapa !== p.etapa) return false;

  if ((p.dataInicio || p.dataFim) && (l.data_criacao_ficha || l.criado)) {
    const iso = l.data_criacao_ficha ?? l.criado!;
    if (p.dataInicio && iso < p.dataInicio) return false;
    if (p.dataFim && iso > p.dataFim) return false;
  }
  return true;
}

function toISO(v?: string): string | undefined {
  if (!v) return undefined;
  const s = String(v);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (m) {
    const [, d, mo, y, hh = '00', mm = '00'] = m;
    return `${y}-${mo}-${d}T${hh}:${mm}:00`;
  }
  return s; // já é ISO ou semelhante
}

function safeNumber(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}