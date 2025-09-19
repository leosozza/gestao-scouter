import { getDataSource } from './datasource';
import { supabase } from '@/integrations/supabase/client';

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

// Bitrix data fetching functions
async function fetchFromBitrix(params: any): Promise<LeadsSummary> {
  try {
    const { data, error } = await supabase
      .from('bitrix_leads')
      .select('*');
    
    if (error) throw error;
    
    const totalLeads = data?.length || 0;
    const convertedLeads = data?.filter(lead => lead.etapa === 'Convertido').length || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    
    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      totalValue: convertedLeads * 10 // Assuming 10 per converted lead
    };
  } catch (error) {
    console.error('Error fetching from Bitrix:', error);
    return { totalLeads: 0, convertedLeads: 0, conversionRate: 0, totalValue: 0 };
  }
}

async function fetchScouterDataFromBitrix(params: any): Promise<LeadsByScouter[]> {
  try {
    const { data, error } = await supabase
      .from('bitrix_leads')
      .select('*');
    
    if (error) throw error;
    
    const scouterStats = data?.reduce((acc: any, lead: any) => {
      const scouter = lead.primeiro_nome || 'Desconhecido';
      if (!acc[scouter]) {
        acc[scouter] = { leads: 0, converted: 0 };
      }
      acc[scouter].leads++;
      if (lead.etapa === 'Convertido') {
        acc[scouter].converted++;
      }
      return acc;
    }, {}) || {};
    
    return Object.entries(scouterStats).map(([scouter, stats]: [string, any]) => ({
      scouter,
      leads: stats.leads,
      converted: stats.converted,
      conversionRate: stats.leads > 0 ? (stats.converted / stats.leads) * 100 : 0,
      value: stats.converted * 10
    }));
  } catch (error) {
    console.error('Error fetching scouter data from Bitrix:', error);
    return [];
  }
}

async function fetchProjectDataFromBitrix(params: any): Promise<LeadsByProject[]> {
  try {
    const { data, error } = await supabase
      .from('bitrix_leads')
      .select('*');
    
    if (error) throw error;
    
    const projectStats = data?.reduce((acc: any, lead: any) => {
      const project = lead.projetos_cormeciais || 'Sem Projeto';
      if (!acc[project]) {
        acc[project] = { leads: 0, converted: 0 };
      }
      acc[project].leads++;
      if (lead.etapa === 'Convertido') {
        acc[project].converted++;
      }
      return acc;
    }, {}) || {};
    
    return Object.entries(projectStats).map(([project, stats]: [string, any]) => ({
      project,
      leads: stats.leads,
      converted: stats.converted,
      conversionRate: stats.leads > 0 ? (stats.converted / stats.leads) * 100 : 0,
      value: stats.converted * 10
    }));
  } catch (error) {
    console.error('Error fetching project data from Bitrix:', error);
    return [];
  }
}

// Export function to get all leads data
export async function getLeads(params?: any): Promise<any[]> {
  const dataSource = getDataSource();
  
  if (dataSource === 'bitrix') {
    return fetchAllLeadsFromBitrix(params);
  } else {
    return fetchAllLeadsFromSheets(params);
  }
}

// Bitrix: Fetch all leads
async function fetchAllLeadsFromBitrix(params: any): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('bitrix_leads')
      .select('*');
    
    if (error) throw error;
    
    return data?.map(lead => ({
      id: lead.id,
      scouter: lead.primeiro_nome || 'Desconhecido',
      project: 'Projeto Comercial', // Using default since field doesn't exist
      etapa: lead.etapa || 'Sem Etapa',
      valor: 10, // Fixed value since 'valor' field doesn't exist
      data: lead.created_at || new Date().toISOString(),
      status: lead.etapa === 'Convertido' ? 'Convertido' : 'Em Andamento'
    })) || [];
  } catch (error) {
    console.error('Error fetching all leads from Bitrix:', error);
    return [];
  }
}

// Google Sheets: Fetch all leads
async function fetchAllLeadsFromSheets(params: any): Promise<any[]> {
  try {
    const { GoogleSheetsService } = await import('@/services/googleSheetsService');
    const fichas = await GoogleSheetsService.fetchFichas();
    
    return fichas.map((ficha, index) => ({
      id: ficha.ID || `ficha-${index}`,
      scouter: ficha['Gestão de Scouter'] || ficha['Primeiro nome'] || 'Desconhecido',
      project: ficha['Projetos Cormeciais'] || 'Sem Projeto',
      etapa: ficha.etapa_normalizada || ficha.Etapa || 'Sem Etapa',
      valor: ficha.valor_por_ficha_num || 0,
      data: ficha['Data de criação da Ficha'] || ficha.Criado || new Date(),
      status: ficha.status_normalizado || 'Aguardando',
      nome: ficha['Primeiro nome'] || 'Sem nome',
      idade: ficha.idade_num || 0,
      local: ficha['Local da Abordagem'] || 'Não informado',
      temFoto: ficha.tem_foto || false,
      fichaConfirmada: ficha.status_normalizado === 'Confirmado',
      fichaPaga: ficha.esta_paga || false
    }));
  } catch (error) {
    console.error('Error fetching leads from Sheets:', error);
    return [];
  }
}

// Google Sheets data fetching functions (mock implementation)
async function fetchFromSheets(params: any): Promise<LeadsSummary> {
  try {
    const leads = await fetchAllLeadsFromSheets(params);
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(lead => lead.etapa === 'Convertido' || lead.fichaConfirmada).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const totalValue = leads.reduce((sum, lead) => sum + (lead.valor || 0), 0);
    
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
      stats.value += lead.valor || 0;
      
      if (lead.fichaConfirmada || lead.etapa === 'Convertido') {
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
      const project = lead.project;
      if (!projectStats.has(project)) {
        projectStats.set(project, { leads: 0, converted: 0, value: 0 });
      }
      
      const stats = projectStats.get(project);
      stats.leads++;
      stats.value += lead.valor || 0;
      
      if (lead.fichaConfirmada || lead.etapa === 'Convertido') {
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