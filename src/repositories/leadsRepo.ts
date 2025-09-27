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
  const totalValue = leads.reduce((s, l) => s + parseFloat(String(l.valor_ficha || '0').replace(',', '.')), 0);
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
    s.value += parseFloat(String(l.valor_ficha || '0').replace(',', '.'));
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
    s.value += parseFloat(String(l.valor_ficha || '0').replace(',', '.'));
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

/** SUPABASE (nova tabela fichas) */
async function fetchAllLeadsFromBitrix(params: LeadsFilters): Promise<Lead[]> {
  let q = supabase.from('fichas').select('*');

  // Filtros usando a nova estrutura
  if (params.dataInicio) q = q.gte('criado', params.dataInicio);
  if (params.dataFim)    q = q.lte('criado', params.dataFim);
  if (params.etapa)      q = q.eq('etapa', params.etapa);

  // Filtros por scouter e projeto
  if (params.scouter)    q = q.ilike('scouter', `%${params.scouter}%`);
  if (params.projeto)    q = q.ilike('projetos', `%${params.projeto}%`);

  const { data, error } = await q;
  if (error) {
    console.error('Fichas query error', error);
    return [];
  }
  return (data ?? []).map(normalizeFichaFromSupabase)
    .filter(l => applyClientSideFilters(l, params));
}

function normalizeLeadFromBitrix(r: any): Lead {
  return {
    id: Number(r.id) || 0,
    projetos: r.projetos_comerciais ?? r.agencia_e_seletivas ?? 'Sem Projeto',
    scouter: r.primeiro_nome ?? r.nome_do_modelo ?? 'Desconhecido',
    criado: r.created_at ?? undefined,
    hora_criacao_ficha: r.data_de_criacao_da_ficha ?? r.created_at ?? undefined,
    valor_ficha: String(r.valor_da_ficha || '0'),
    etapa: r.etapa ?? 'Sem Etapa',
    nome: r.nome_do_responsavel ?? r.primeiro_nome ?? 'Sem nome',
    gerenciamentofunil: r.gerenciamentofunil ?? r.gerenciamento_funil ?? undefined,
    etapafunil: r.etapafunil ?? r.etapa_funil ?? undefined,
    modelo: r.nome_do_modelo ?? r.primeiro_nome ?? '',
    localizacao: r.localizacao ?? undefined,
    ficha_confirmada: r.ficha_confirmada ?? undefined,
    idade: String(r.idade || ''),
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

function normalizeFichaFromSupabase(r: any): Lead {
  return {
    id: Number(r.id) || 0,
    projetos: String(r.projetos || 'Sem Projeto'),
    scouter: String(r.scouter || 'Desconhecido'),
    criado: r.criado,
    hora_criacao_ficha: r.hora_criacao_ficha,
    valor_ficha: String(r.valor_ficha || '0'),
    etapa: String(r.etapa || 'Sem Etapa'),
    nome: String(r.nome || 'Sem nome'),
    gerenciamentofunil: r.gerenciamentofunil,
    etapafunil: r.etapafunil,
    modelo: String(r.modelo || ''),
    localizacao: r.localizacao,
    ficha_confirmada: r.ficha_confirmada,
    idade: r.idade,
    local_da_abordagem: r.local_da_abordagem,
    cadastro_existe_foto: r.cadastro_existe_foto,
    presenca_confirmada: r.presenca_confirmada,
    supervisor_do_scouter: r.supervisor_do_scouter,
    data_confirmacao_ficha: r.data_confirmacao_ficha,
    foto: r.foto,
    compareceu: r.compareceu,
    confirmado: r.confirmado,
    datahoracel: r.datahoracel,
    funilfichas: r.funilfichas,
    tabulacao: r.tabulacao,
    agendado: r.agendado,
    qdoagendou: r.qdoagendou,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function normalizeLeadFromSheets(f: any, idx?: number): Lead {
  return {
    id: Number(f.ID) ?? (idx != null ? idx : 0),
    projetos: f.Projetos ?? f['Projetos Cormeciais'] ?? f['Agencia e Seletivas'] ?? 'Sem Projeto',
    scouter: f.Scouter ?? f['Gestão de Scouter'] ?? 'Desconhecido',
    criado: f.Criado ?? undefined,
    hora_criacao_ficha: f.hora_criacao_Ficha ?? undefined,
    valor_ficha: f.Valor_Ficha ?? f['Valor da Ficha'] ?? '0',
    etapa: f.Etapa ?? f['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] ?? 'Sem Etapa',
    nome: f.Nome ?? f['Nome do Responsável'] ?? f['Primeiro nome'] ?? 'Sem nome',
    gerenciamentofunil: f.GERENCIAMENTOFUNIL ?? f['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO'] ?? undefined,
    etapafunil: f.ETAPAFUNIL ?? f['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] ?? undefined,
    modelo: f.modelo ?? f['Nome do Modelo'] ?? '',
    localizacao: f.Localizacao ?? f.Localização ?? undefined,
    ficha_confirmada: f.Ficha_confirmada ?? f['Ficha confirmada'] ?? undefined,
    idade: f.Idade ?? f.Idade_num ?? undefined,
    local_da_abordagem: f.Local_da_Abordagem ?? f['Local da Abordagem'] ?? undefined,
    cadastro_existe_foto: f.Cadastro_Existe_Foto ?? f['Cadastro Existe Foto?'] ?? undefined,
    presenca_confirmada: f.Presenca_Confirmada ?? f['Presença Confirmada'] ?? undefined,
    supervisor_do_scouter: f.Supervisor_do_Scouter ?? f['Supervisor do Scouter'] ?? undefined,
    data_confirmacao_ficha: f.Data_confirmacao_ficha ?? undefined,
    foto: f.Foto ?? undefined,
    compareceu: f.Compareceu ?? undefined,
    confirmado: f.Confirmado ?? undefined,
    datahoracel: f.Datahoracel ?? undefined,
    funilfichas: f.Funilfichas ?? undefined,
    tabulacao: f.Tabulacao ?? undefined,
    agendado: f.Agendado ?? undefined,
    qdoagendou: f.Qdoagendou ?? undefined,
  };
}

/** Helpers comuns */
function applyClientSideFilters(l: Lead, p: LeadsFilters): boolean {
  if (p.scouter && !l.scouter?.toLowerCase().includes(p.scouter.toLowerCase())) return false;
  if (p.projeto && !l.projetos?.toLowerCase().includes(p.projeto.toLowerCase())) return false;
  if (p.etapa && l.etapa !== p.etapa) return false;

  if ((p.dataInicio || p.dataFim) && l.criado) {
    const dateStr = l.criado;
    // Convert dd/MM/yyyy to yyyy-MM-dd for comparison
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      if (p.dataInicio && isoDate < p.dataInicio) return false;
      if (p.dataFim && isoDate > p.dataFim) return false;
    }
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