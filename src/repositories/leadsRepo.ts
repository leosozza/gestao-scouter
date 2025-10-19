/**
 * Repository para buscar leads do Supabase LOCAL
 * 
 * ⚠️ ATENÇÃO DESENVOLVEDOR: FONTE ÚNICA DE VERDADE
 * ================================================
 * Este repositório usa EXCLUSIVAMENTE a tabela 'leads' do Supabase LOCAL.
 * 
 * NUNCA utilize (LEGACY/DEPRECATED):
 * - Tabela 'fichas' (migrada para 'leads' — deprecated, será removida)
 * - Tabela 'bitrix_leads' (apenas para referência histórica)
 * - MockDataService (apenas para testes locais)
 * 
 * SINCRONIZAÇÃO:
 * - A tabela 'leads' sincroniza bidirecionalmente com TabuladorMax
 * - TabuladorMax tem sua própria tabela 'leads'
 * - A tabela 'leads' foi criada com o mesmo schema do TabuladorMax para evitar erros
 * - Sync é gerenciado por Edge Functions do Supabase
 * 
 * Todas as operações de leads devem passar por este repositório centralizado.
 */

import { supabase } from '@/lib/supabase-helper';
import type { Lead, LeadsFilters } from './types';
import { toYMD } from '@/utils/dataHelpers';

// Mapeia dados do banco (name, commercial_project_id) para o formato da aplicação (nome, projetos)
function mapDatabaseToLead(row: any): Lead {
  return {
    id: row.id,
    nome: row.name,
    projetos: row.commercial_project_id,
    scouter: row.scouter,
    criado: row.criado,
    valor_ficha: row.valor_ficha,
    etapa: row.etapa,
    modelo: row.nome_modelo,
    localizacao: row.address,
    ficha_confirmada: row.ficha_confirmada ? 'Sim' : 'Não',
    idade: row.age?.toString(),
    local_da_abordagem: row.local_abordagem,
    cadastro_existe_foto: row.cadastro_existe_foto ? 'SIM' : 'NÃO',
    presenca_confirmada: row.presenca_confirmada ? 'Sim' : 'Não',
    supervisor_do_scouter: row.responsible,
    foto: row.photo_url,
    compareceu: row.compareceu ? 'Sim' : 'Não',
    telefone: row.celular?.toString() || row.telefone_trabalho?.toString(),
    email: row.raw?.email,
    latitude: row.raw?.latitude,
    longitude: row.raw?.longitude,
    created_at: row.criado,
    updated_at: row.updated_at,
    data_criacao_ficha: row.data_criacao_ficha,
    tabulacao: row.status_tabulacao,
    agendado: row.data_agendamento,
    funilfichas: row.funil_fichas,
    gerenciamentofunil: row.gerenciamento_funil,
    etapafunil: row.etapa_funil,
  };
}

/**
 * Busca leads do Supabase com filtros
 * @returns Array de leads da tabela 'leads'
 */
export async function getLeads(params: LeadsFilters = {}): Promise<Lead[]> {
  return fetchAllLeadsFromSupabase(params);
}

/**
 * Cria um novo lead no Supabase
 * @param lead - Dados do lead a ser criado
 * @returns Lead criado
 */
export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  // Preparar dados para inserção (converter para formato do banco)
  const insertData: any = {
    commercial_project_id: lead.projetos,
    scouter: lead.scouter,
    name: lead.nome,
    valor_ficha: lead.valor_ficha,
    etapa: lead.etapa,
    nome_modelo: lead.modelo,
    address: lead.localizacao,
    celular: lead.telefone ? parseInt(lead.telefone) : null,
    raw: {
      email: lead.email,
      latitude: lead.latitude,
      longitude: lead.longitude,
    },
    criado: lead.criado || new Date().toISOString(),
    ficha_confirmada: lead.ficha_confirmada === 'Sim',
    cadastro_existe_foto: lead.cadastro_existe_foto === 'SIM',
    presenca_confirmada: lead.presenca_confirmada === 'Sim',
    compareceu: lead.compareceu === 'Sim',
  };

  const { data, error } = await supabase
    .from('leads')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao criar lead:', error);
    throw error;
  }

  return mapDatabaseToLead(data);
}

/**
 * Atualiza um lead existente
 * @param id - ID do lead
 * @param lead - Dados parciais a atualizar
 * @returns Lead atualizado
 */
export async function updateLead(id: string | number, lead: Partial<Lead>): Promise<Lead> {
  const updateData: any = {};
  
  if (lead.projetos) updateData.commercial_project_id = lead.projetos;
  if (lead.scouter) updateData.scouter = lead.scouter;
  if (lead.nome) updateData.name = lead.nome;
  if (lead.valor_ficha !== undefined) updateData.valor_ficha = lead.valor_ficha;
  if (lead.etapa) updateData.etapa = lead.etapa;
  if (lead.modelo) updateData.nome_modelo = lead.modelo;
  if (lead.localizacao) updateData.address = lead.localizacao;
  if (lead.telefone) updateData.celular = parseInt(lead.telefone);
  if (lead.ficha_confirmada) updateData.ficha_confirmada = lead.ficha_confirmada === 'Sim';
  if (lead.cadastro_existe_foto) updateData.cadastro_existe_foto = lead.cadastro_existe_foto === 'SIM';
  if (lead.presenca_confirmada) updateData.presenca_confirmada = lead.presenca_confirmada === 'Sim';
  if (lead.compareceu) updateData.compareceu = lead.compareceu === 'Sim';
  
  // Atualizar raw se necessário
  if (lead.email || lead.latitude || lead.longitude) {
    updateData.raw = {
      ...(updateData.raw || {}),
      ...(lead.email && { email: lead.email }),
      ...(lead.latitude && { latitude: lead.latitude }),
      ...(lead.longitude && { longitude: lead.longitude }),
    };
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao atualizar lead:', error);
    throw error;
  }

  return mapDatabaseToLead(data);
}

/**
 * Busca um único lead por ID
 * @param id - ID do lead
 * @returns Lead encontrado ou null
 */
export async function getLeadById(id: string | number): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao buscar lead:', error);
    return null;
  }

  return data ? mapDatabaseToLead(data) : null;
}

/**
 * Busca todos os leads com paginação e filtros
 * @param filters - Filtros opcionais
 * @param page - Página atual (iniciando em 0)
 * @param pageSize - Tamanho da página
 * @returns Array paginado de leads
 */
export async function fetchPaginatedLeads(
  filters: LeadsFilters = {},
  page: number = 0,
  pageSize: number = 50
): Promise<Lead[]> {
  console.log('🔍 [LeadsRepo] Iniciando busca paginada de leads');
  console.log('🗂️  [LeadsRepo] Tabela sendo consultada: "leads"');
  console.log('🗂️  [LeadsRepo] Filtros:', filters);
  console.log('📄 [LeadsRepo] Paginação:', { page, pageSize });

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .or('deleted.is.false,deleted.is.null');

  if (filters.dataInicio) {
    console.log('📅 [LeadsRepo] Aplicando filtro dataInicio:', filters.dataInicio);
    query = query.gte('criado', filters.dataInicio);
  }

  if (filters.dataFim) {
    console.log('📅 [LeadsRepo] Aplicando filtro dataFim:', filters.dataFim);
    query = query.lte('criado', filters.dataFim);
  }

  if (filters.scouter) {
    console.log('👤 [LeadsRepo] Aplicando filtro scouter:', filters.scouter);
    query = query.eq('scouter', filters.scouter);
  }

  if (filters.projeto) {
    console.log('📁 [LeadsRepo] Aplicando filtro projeto:', filters.projeto);
    query = query.eq('commercial_project_id', filters.projeto);
  }

  if (filters.etapa) {
    console.log('📋 [LeadsRepo] Aplicando filtro etapa:', filters.etapa);
    query = query.eq('etapa', filters.etapa);
  }

  query = query
    .order('criado', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  console.log('🚀 [LeadsRepo] Executando query no Supabase...');
  const { data, error, count } = await query;

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao buscar leads:', error);
    throw new Error(`Erro ao buscar dados do Supabase: ${error.message}`);
  }

  console.log('✅ [LeadsRepo] Query executada com sucesso!');
  console.log(`📊 [LeadsRepo] Total de registros na tabela "leads" (com filtros): ${count}`);
  console.log(`📦 [LeadsRepo] Registros retornados nesta query: ${data?.length || 0}`);

  if (!data || data.length === 0) {
    console.warn('⚠️ [LeadsRepo] Nenhum registro encontrado na tabela "leads"');
    console.warn('💡 Verifique: se há dados, filtros ou RLS.');
  }

  return (data || []).map(mapDatabaseToLead);
}

/**
 * Busca TODOS os leads sem paginação
 * @param filters - Filtros opcionais
 * @returns Array completo de leads
 */
export async function fetchAllLeadsFromSupabase(filters: LeadsFilters = {}): Promise<Lead[]> {
  console.log('🔍 [LeadsRepo] Iniciando busca COMPLETA de leads');
  console.log('🗂️  [LeadsRepo] Tabela sendo consultada: "leads"');
  console.log('🗂️  [LeadsRepo] Filtros:', filters);

  let query = supabase
    .from('leads')
    .select('*')
    .or('deleted.is.false,deleted.is.null');

  if (filters.dataInicio) {
    const startDate = toYMD(filters.dataInicio);
    console.log('📅 [LeadsRepo] Filtro dataInicio:', startDate);
    query = query.gte('criado', startDate);
  }

  if (filters.dataFim) {
    const endDate = toYMD(filters.dataFim);
    console.log('📅 [LeadsRepo] Filtro dataFim:', endDate);
    query = query.lte('criado', endDate);
  }

  if (filters.scouter) {
    console.log('👤 [LeadsRepo] Filtro scouter:', filters.scouter);
    query = query.eq('scouter', filters.scouter);
  }

  if (filters.projeto) {
    console.log('📁 [LeadsRepo] Filtro projeto:', filters.projeto);
    query = query.eq('commercial_project_id', filters.projeto);
  }

  if (filters.etapa) {
    console.log('📋 [LeadsRepo] Filtro etapa:', filters.etapa);
    query = query.eq('etapa', filters.etapa);
  }

  query = query.order('criado', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao buscar leads:', error);
    throw new Error(`Erro ao buscar dados do Supabase: ${error.message}`);
  }

  console.log(`📦 Total de ${data?.length || 0} registros retornados`);
  return (data || []).map(mapDatabaseToLead);
}

/**
 * Busca lista única de projetos
 * @returns Array de nomes de projetos
 */
export async function getUniqueProjects(): Promise<string[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('commercial_project_id')
    .or('deleted.is.false,deleted.is.null');

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao buscar projetos:', error);
    return [];
  }

  const projects = [...new Set(data?.map(d => d.commercial_project_id).filter(Boolean))];
  return projects as string[];
}

/**
 * Busca lista única de scouters
 * @returns Array de nomes de scouters
 */
export async function getUniqueScouters(): Promise<string[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('scouter')
    .or('deleted.is.false,deleted.is.null');

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao buscar scouters:', error);
    return [];
  }

  const scouters = [...new Set(data?.map(d => d.scouter).filter(Boolean))];
  return scouters as string[];
}

/**
 * Deleta leads (soft delete)
 * @param ids - Array de IDs dos leads a deletar
 */
export async function deleteLeads(ids: (string | number)[]): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ deleted: true })
    .in('id', ids);

  if (error) {
    console.error('❌ [LeadsRepo] Erro ao deletar leads:', error);
    throw error;
  }
}

