/**
 * Repository para buscar leads do Supabase
 * Removida toda dependência do Google Sheets
 * 
 * ⚠️ ATENÇÃO DESENVOLVEDOR: FONTE ÚNICA DE VERDADE
 * ================================================
 * Este repositório usa EXCLUSIVAMENTE a tabela 'fichas' do Supabase.
 * NUNCA utilize:
 * - Tabela 'leads' (legacy/deprecated)
 * - Tabela 'bitrix_leads' (apenas para referência histórica)
 * - MockDataService (apenas para testes locais)
 * - Fetch direto de Google Sheets (descontinuado)
 * 
 * Todas as operações de leads devem passar por este repositório centralizado.
 */

import { supabase } from '@/lib/supabase-helper';
import type { Lead, LeadsFilters } from './types';

/**
 * Busca leads do Supabase com filtros
 * @returns Array de leads da tabela 'fichas'
 */
export async function getLeads(params: LeadsFilters = {}): Promise<Lead[]> {
  return fetchAllLeadsFromSupabase(params);
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
  const convertedLeads = leads.filter(l => l.etapa === 'Convertido' || l.ficha_confirmada === 'Confirmada').length;
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
    if (l.etapa === 'Convertido' || l.ficha_confirmada === 'Confirmada') s.converted++;
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
    if (l.etapa === 'Convertido' || l.ficha_confirmada === 'Confirmada') s.converted++;
  }
  return [...map].map(([project, s]) => ({
    project,
    leads: s.leads,
    converted: s.converted,
    conversionRate: s.leads ? (s.converted / s.leads) * 100 : 0,
    value: s.value,
  }));
}

/**
 * Busca leads do Supabase
 */
async function fetchAllLeadsFromSupabase(params: LeadsFilters): Promise<Lead[]> {
  let q = supabase.from('fichas').select('*');

  // Aplicar filtros
  if (params.dataInicio) q = q.gte('criado', params.dataInicio);
  if (params.dataFim) q = q.lte('criado', params.dataFim);
  if (params.etapa) q = q.eq('etapa', params.etapa);
  if (params.scouter) q = q.ilike('scouter', `%${params.scouter}%`);
  if (params.projeto) q = q.ilike('projeto', `%${params.projeto}%`);

  const { data, error } = await q.order('criado', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar leads do Supabase', error);
    return [];
  }
  
  return (data ?? []).map(normalizeFichaFromSupabase)
    .filter(l => applyClientSideFilters(l, params));
}

/**
 * Busca leads da tabela bitrix_leads (comentado - tabela não existe ainda)
 * 
 * ⚠️ DESCONTINUADO: Esta função é mantida apenas para compatibilidade.
 * A tabela bitrix_leads existe mas NÃO deve ser usada para buscar leads em produção.
 * Use sempre getLeads() que consulta a tabela 'fichas' (fonte única de verdade).
 */
export async function getBitrixLeads(params: LeadsFilters = {}): Promise<Lead[]> {
  // Tabela bitrix_leads não é mais fonte de dados para a aplicação
  console.warn('getBitrixLeads: DESCONTINUADO - Use getLeads() que consulta a tabela "fichas"');
  return [];
}

/**
 * Normaliza ficha do Supabase para formato Lead
 */
function normalizeFichaFromSupabase(r: any): Lead {
  return {
    id: Number(r.id) || 0,
    projetos: String(r.projeto || 'Sem Projeto'),
    scouter: String(r.scouter || 'Desconhecido'),
    criado: r.criado,
    hora_criacao_ficha: r.hora_criacao_ficha,
    valor_ficha: String(r.valor_ficha || '0'),
    etapa: String(r.etapa || 'Sem Etapa'),
    nome: String(r.nome || 'Sem nome'),
    modelo: String(r.modelo || ''),
    localizacao: r.localizacao,
    ficha_confirmada: r.ficha_confirmada,
    idade: r.idade,
    local_da_abordagem: r.local_da_abordagem,
    cadastro_existe_foto: r.cadastro_existe_foto,
    presenca_confirmada: r.presenca_confirmada,
    supervisor_do_scouter: r.supervisor,
    foto: r.foto,
    compareceu: r.compareceu,
    confirmado: r.confirmado,
    tabulacao: r.tabulacao,
    agendado: r.agendado,
    telefone: r.telefone,
    email: r.email,
    latitude: r.latitude,
    longitude: r.longitude,
    created_at: r.created_at,
    updated_at: r.updated_at,
    aprovado: r.aprovado !== undefined ? r.aprovado : null,
    data_criacao_ficha: r.criado,
  };
}

/**
 * Normaliza lead da tabela bitrix_leads
 */
function normalizeBitrixLead(r: any): Lead {
  return {
    id: r.bitrix_id || 0,
    projetos: 'Sem Projeto',
    scouter: r.primeiro_nome ?? 'Desconhecido',
    criado: r.data_de_criacao_da_ficha ?? r.created_at ?? undefined,
    hora_criacao_ficha: r.data_de_criacao_da_ficha ?? undefined,
    valor_ficha: '0',
    etapa: r.etapa ?? 'Sem Etapa',
    nome: r.primeiro_nome ?? 'Sem nome',
    modelo: r.nome_do_modelo ?? '',
    local_da_abordagem: r.local_da_abordagem ?? undefined,
    idade: r.altura_cm ?? '',
    telefone: r.telefone_de_trabalho ?? r.celular ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Aplicar filtros client-side adicionais
 */
function applyClientSideFilters(l: Lead, p: LeadsFilters): boolean {
  if (p.scouter && !l.scouter?.toLowerCase().includes(p.scouter.toLowerCase())) return false;
  if (p.projeto && !l.projetos?.toLowerCase().includes(p.projeto.toLowerCase())) return false;
  if (p.etapa && l.etapa !== p.etapa) return false;

  // Filtros de data já são aplicados no query Supabase
  return true;
}
