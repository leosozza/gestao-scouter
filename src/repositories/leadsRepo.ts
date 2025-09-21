import { getDataSource } from './datasource';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, LeadsFilters } from './types';
import { toISO, safeNumber, toBool, normalizeText } from '@/utils/dataHelpers';

export interface LeadsSummary {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalValue: number;
}

export interface LeadsByScouter {
  scouter: string;
  leads: number;
  converted: number;
  conversionRate: number;
  value: number;
}

export interface LeadsByProject {
  project: string;
  leads: number;
  converted: number;
  conversionRate: number;
  value: number;
}

// Main getLeads function with proper filtering and normalization
export async function getLeads(params?: LeadsFilters): Promise<Lead[]> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchAllLeadsFromBitrix(params);
  } else {
    return fetchAllLeadsFromSheets(params);
  }
}

// Abstract data fetching based on selected data source
export async function getLeadsSummary(params: any): Promise<LeadsSummary> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchFromBitrix(params);
  } else {
    return fetchFromSheets(params);
  }
}

export async function getLeadsByScouter(params: any): Promise<LeadsByScouter[]> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchScouterDataFromBitrix(params);
  } else {
    return fetchScouterDataFromSheets(params);
  }
}

export async function getLeadsByProject(params: any): Promise<LeadsByProject[]> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchProjectDataFromBitrix(params);
  } else {
    return fetchProjectDataFromSheets(params);
  }
}

// Bitrix: Fetch all leads with normalization
async function fetchAllLeadsFromBitrix(params?: LeadsFilters): Promise<Lead[]> {
  try {
    let query = supabase.from('bitrix_leads').select('*');
    
    // Apply server-side filters for Bitrix
    if (params?.dataInicio) {
      query = query.gte('created_at', params.dataInicio);
    }
    if (params?.dataFim) {
      query = query.lte('created_at', params.dataFim);
    }
    if (params?.scouter) {
      query = query.ilike('primeiro_nome', `%${params.scouter}%`);
    }
    if (params?.etapa) {
      query = query.eq('etapa', params.etapa);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(lead => normalizeLeadFromBitrix(lead));
  } catch (error) {
    console.error('Error fetching all leads from Bitrix:', error);
    return [];
  }
}

// Normalize Bitrix lead to canonical format
function normalizeLeadFromBitrix(lead: any): Lead {
  return {
    id: lead.id || '',
    projetos: lead.projetos_comerciais || lead.agencia_e_seletivas || 'Sem Projeto',
    scouter: lead.primeiro_nome || lead.nome_do_modelo || 'Desconhecido',
    criado: lead.created_at,
    data_criacao_ficha: lead.data_de_criacao_da_ficha || lead.created_at,
    valor_ficha: safeNumber(lead.valor_da_ficha),
    etapa: lead.etapa || 'Sem Etapa',
    nome: lead.nome_do_responsavel || lead.primeiro_nome || 'Sem nome',
    gerenciamentofunil: lead.gerenciamentofunil || '',
    etapafunil: lead.etapafunil || '',
    modelo: lead.nome_do_modelo || lead.primeiro_nome || '',
    localizacao: lead.localizacao || '',
    ficha_confirmada: lead.ficha_confirmada || 'Aguardando',
    idade: safeNumber(lead.idade),
    local_da_abordagem: lead.local_da_abordagem || '',
    cadastro_existe_foto: lead.cadastro_existe_foto || 'NÃO',
    presenca_confirmada: lead.presenca_confirmada || 'Não',
    supervisor_do_scouter: lead.supervisor_do_scouter || ''
  };
}

// Google Sheets: Fetch all leads with normalization
async function fetchAllLeadsFromSheets(params?: LeadsFilters): Promise<Lead[]> {
  try {
    const { GoogleSheetsService } = await import('@/services/googleSheetsService');
    const fichas = await GoogleSheetsService.fetchFichas();
    
    let leads = fichas.map((ficha, index) => normalizeLeadFromSheets(ficha, index));
    
    // Apply client-side filters for Sheets
    if (params?.scouter) {
      leads = leads.filter(lead => 
        lead.scouter.toLowerCase().includes(params.scouter!.toLowerCase())
      );
    }
    if (params?.projeto) {
      leads = leads.filter(lead => 
        lead.projetos.toLowerCase().includes(params.projeto!.toLowerCase())
      );
    }
    if (params?.etapa) {
      leads = leads.filter(lead => lead.etapa === params.etapa);
    }
    if (params?.dataInicio && params?.dataFim) {
      const startDate = new Date(params.dataInicio);
      const endDate = new Date(params.dataFim);
      leads = leads.filter(lead => {
        const leadDate = new Date(lead.criado || '');
        return leadDate >= startDate && leadDate <= endDate;
      });
    }
    
    return leads;
  } catch (error) {
    console.error('Error fetching leads from Sheets:', error);
    return [];
  }
}

// Normalize Sheets lead to canonical format
function normalizeLeadFromSheets(ficha: any, index: number): Lead {
  return {
    id: ficha.ID || `ficha-${index}`,
    projetos: ficha.Projetos || ficha['Projetos Cormeciais'] || ficha['Agencia e Seletivas'] || 'Sem Projeto',
    scouter: ficha.Scouter || ficha['Gestão de Scouter'] || 'Desconhecido',
    criado: toISO(ficha.Criado || ficha.Criado_date || ''),
    data_criacao_ficha: toISO(ficha['Data de criação da Ficha'] || ficha.Data_criacao_Ficha || ''),
    valor_ficha: safeNumber(ficha['Valor da Ficha'] || ficha.Valor_Ficha),
    etapa: ficha.Etapa || ficha['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] || 'Sem Etapa',
    nome: ficha['Nome do Responsável'] || ficha['Primeiro nome'] || ficha.Nome || 'Sem nome',
    gerenciamentofunil: ficha['GERENCIAMENTO FUNIL DE QUALIFICAÇAO/AGENDAMENTO'] || ficha.GERENCIAMENTOFUNIL || '',
    etapafunil: ficha['ETAPA FUNIL QUALIFICAÇÃO/AGENDAMENTO'] || ficha.ETAPAFUNIL || '',
    modelo: ficha['Nome do Modelo'] || ficha.modelo || '',
    localizacao: ficha.Localização || ficha.Localizacao || '',
    ficha_confirmada: ficha['Ficha confirmada'] || ficha.Ficha_confirmada || 'Aguardando',
    idade: safeNumber(ficha.Idade || ficha.Idade_num),
    local_da_abordagem: ficha['Local da Abordagem'] || ficha.Local_da_Abordagem || '',
    cadastro_existe_foto: ficha['Cadastro Existe Foto?'] || ficha.Cadastro_Existe_Foto || 'NÃO',
    presenca_confirmada: ficha['Presença Confirmada'] || ficha.Presenca_Confirmada || 'Não',
    supervisor_do_scouter: ficha['Supervisor do Scouter'] || ficha.Supervisor_do_Scouter || ''
  };
}

// Bitrix data fetching functions
async function fetchFromBitrix(params: any): Promise<LeadsSummary> {
  try {
    const leads = await fetchAllLeadsFromBitrix(params);
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(lead => lead.etapa === 'Convertido').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.valor_ficha || 0), 0);
    
    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      totalValue
    };
  } catch (error) {
    console.error('Error fetching from Bitrix:', error);
    return { totalLeads: 0, convertedLeads: 0, conversionRate: 0, totalValue: 0 };
  }
}

async function fetchScouterDataFromBitrix(params: any): Promise<LeadsByScouter[]> {
  try {
    const leads = await fetchAllLeadsFromBitrix(params);
    const scouterStats = new Map();
    
    leads.forEach(lead => {
      const scouter = lead.scouter;
      if (!scouterStats.has(scouter)) {
        scouterStats.set(scouter, { leads: 0, converted: 0, value: 0 });
      }
      
      const stats = scouterStats.get(scouter);
      stats.leads++;
      stats.value += lead.valor_ficha || 0;
      
      if (lead.etapa === 'Convertido') {
        stats.converted++;
      }
    });
    
    return Array.from(scouterStats.entries()).map(([scouter, stats]) => ({
      scouter,
      leads: stats.leads,
      converted: stats.converted,
      conversionRate: stats.leads > 0 ? (stats.converted / stats.leads) * 100 : 0,
      value: stats.value
    }));
  } catch (error) {
    console.error('Error fetching scouter data from Bitrix:', error);
    return [];
  }
}

async function fetchProjectDataFromBitrix(params: any): Promise<LeadsByProject[]> {
  try {
    const leads = await fetchAllLeadsFromBitrix(params);
    const projectStats = new Map();
    
    leads.forEach(lead => {
      const project = lead.projetos;
      if (!projectStats.has(project)) {
        projectStats.set(project, { leads: 0, converted: 0, value: 0 });
      }
      
      const stats = projectStats.get(project);
      stats.leads++;
      stats.value += lead.valor_ficha || 0;
      
      if (lead.etapa === 'Convertido') {
        stats.converted++;
      }
    });
    
    return Array.from(projectStats.entries()).map(([project, stats]) => ({
      project,
      leads: stats.leads,
      converted: stats.converted,
      conversionRate: stats.leads > 0 ? (stats.converted / stats.leads) * 100 : 0,
      value: stats.value
    }));
  } catch (error) {
    console.error('Error fetching project data from Bitrix:', error);
    return [];
  }
}

// Google Sheets data fetching functions
async function fetchFromSheets(params: any): Promise<LeadsSummary> {
  try {
    const leads = await fetchAllLeadsFromSheets(params);
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(lead => 
      lead.etapa === 'Convertido' || lead.ficha_confirmada === 'Sim'
    ).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.valor_ficha || 0), 0);
    
    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      totalValue
    };
  } catch (error) {
    console.error('Error calculating summary from Sheets:', error);
    return {
      totalLeads: 0,
      convertedLeads: 0,
      conversionRate: 0,
      totalValue: 0
    };
  }
}

async function fetchScouterDataFromSheets(params: any): Promise<LeadsByScouter[]> {
  try {
    const leads = await fetchAllLeadsFromSheets(params);
    const scouterStats = new Map();
    
    leads.forEach(lead => {
      const scouter = lead.scouter;
      if (!scouterStats.has(scouter)) {
        scouterStats.set(scouter, { leads: 0, converted: 0, value: 0 });
      }
      
      const stats = scouterStats.get(scouter);
      stats.leads++;
      stats.value += lead.valor_ficha || 0;
      
      if (lead.ficha_confirmada === 'Sim' || lead.etapa === 'Convertido') {
        stats.converted++;
      }
    });
    
    return Array.from(scouterStats.entries()).map(([scouter, stats]) => ({
      scouter,
      leads: stats.leads,
      converted: stats.converted,
      conversionRate: stats.leads > 0 ? (stats.converted / stats.leads) * 100 : 0,
      value: stats.value
    }));
  } catch (error) {
    console.error('Error fetching scouter data from Sheets:', error);
    return [];
  }
}

async function fetchProjectDataFromSheets(params: any): Promise<LeadsByProject[]> {
  try {
    const leads = await fetchAllLeadsFromSheets(params);
    const projectStats = new Map();
    
    leads.forEach(lead => {
      const project = lead.projetos;
      if (!projectStats.has(project)) {
        projectStats.set(project, { leads: 0, converted: 0, value: 0 });
      }
      
      const stats = projectStats.get(project);
      stats.leads++;
      stats.value += lead.valor_ficha || 0;
      
      if (lead.ficha_confirmada === 'Sim' || lead.etapa === 'Convertido') {
        stats.converted++;
      }
    });
    
    return Array.from(projectStats.entries()).map(([project, stats]) => ({
      project,
      leads: stats.leads,
      converted: stats.converted,
      conversionRate: stats.leads > 0 ? (stats.converted / stats.leads) * 100 : 0,
      value: stats.value
    }));
  } catch (error) {
    console.error('Error fetching project data from Sheets:', error);
    return [];
  }
}