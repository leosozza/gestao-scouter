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

// Google Sheets data fetching functions (mock implementation)
async function fetchFromSheets(params: any): Promise<LeadsSummary> {
  // Mock data for demonstration
  return {
    totalLeads: 150,
    convertedLeads: 45,
    conversionRate: 30,
    totalValue: 4500
  };
}

async function fetchScouterDataFromSheets(params: any): Promise<LeadsByScouter[]> {
  // Mock data for demonstration
  return [
    { scouter: 'Ana Silva', leads: 50, converted: 15, conversionRate: 30, value: 1500 },
    { scouter: 'Carlos Santos', leads: 35, converted: 12, conversionRate: 34.3, value: 1200 },
    { scouter: 'Maria Oliveira', leads: 65, converted: 18, conversionRate: 27.7, value: 1800 }
  ];
}

async function fetchProjectDataFromSheets(params: any): Promise<LeadsByProject[]> {
  // Mock data for demonstration
  return [
    { project: 'Projeto A', leads: 80, converted: 25, conversionRate: 31.25, value: 2500 },
    { project: 'Projeto B', leads: 70, converted: 20, conversionRate: 28.6, value: 2000 }
  ];
}