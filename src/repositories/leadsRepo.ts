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
 * Busca leads do Supabase (fonte única)
 */
async function fetchAllLeadsFromSupabase(params: LeadsFilters): Promise<Lead[]> {
  try {
    console.log('🔍 [LeadsRepo] Iniciando busca de leads com filtros:', params);
    console.log('🗂️  [LeadsRepo] Tabela sendo consultada: "fichas"');
    
    let q = supabase.from('fichas').select('*', { count: 'exact' });

    // ✅ Filtros compatíveis com 'criado' OU 'created_at'
    if (params.dataInicio) {
      console.log('📅 [LeadsRepo] Aplicando filtro dataInicio:', params.dataInicio);
      q = q.or(`criado.gte.${params.dataInicio},created_at.gte.${params.dataInicio}`);
    }
    if (params.dataFim) {
      console.log('📅 [LeadsRepo] Aplicando filtro dataFim:', params.dataFim);
      q = q.or(`criado.lte.${params.dataFim},created_at.lte.${params.dataFim}`);
    }

    if (params.etapa) {
      console.log('📊 [LeadsRepo] Aplicando filtro etapa:', params.etapa);
      q = q.eq('etapa', params.etapa);
    }
    if (params.scouter) {
      console.log('👤 [LeadsRepo] Aplicando filtro scouter:', params.scouter);
      q = q.ilike('scouter', `%${params.scouter}%`);
    }
    if (params.projeto) {
      console.log('📁 [LeadsRepo] Aplicando filtro projeto:', params.projeto);
      q = q.ilike('projeto', `%${params.projeto}%`);
    }

    console.log('🚀 [LeadsRepo] Executando query no Supabase...');
    const { data, error, count } = await q.order('criado', { ascending: false });

    if (error) {
      console.error('❌ [LeadsRepo] Erro ao buscar leads do Supabase:', error);
      throw new Error(`Erro ao buscar dados do Supabase: ${error.message}`);
    }

    console.log(`✅ [LeadsRepo] Query executada com sucesso!`);
    console.log(`📊 [LeadsRepo] Total de registros na tabela "fichas" (com filtros): ${count ?? 'N/A'}`);
    console.log(`📦 [LeadsRepo] Registros retornados nesta query: ${data?.length || 0}`);

    if (!data || data.length === 0) {
      console.warn('⚠️ [LeadsRepo] Nenhum registro encontrado na tabela "fichas"');
      console.warn('💡 Verifique: se há dados, filtros ou RLS.');
      return [];
    }

    const normalized = data.map(normalizeFichaFromSupabase);
    const filtered = normalized.filter(l => applyClientSideFilters(l, params));

    console.log(`📋 [LeadsRepo] Após normalização e filtros client-side: ${filtered.length} leads`);
    return filtered;
  } catch (error) {
    console.error('❌ [LeadsRepo] Exceção durante busca de leads:', error);
    throw error;
  }
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
 * Filtros client-side
 */
function applyClientSideFilters(l: Lead, p: LeadsFilters): boolean {
  if (p.scouter && !l.scouter?.toLowerCase().includes(p.scouter.toLowerCase())) return false;
  if (p.projeto && !l.projetos?.toLowerCase().includes(p.projeto.toLowerCase())) return false;
  if (p.etapa && l.etapa !== p.etapa) return false;
  return true;
}