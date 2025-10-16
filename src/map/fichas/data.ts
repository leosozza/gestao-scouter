/**
 * Fichas Data Module
 * Handles loading and parsing of fichas data
 */

import { fetchFichasData, FichaMapData } from '@/services/googleSheetsMapService';
import type { FichaDataPoint as FichaDataPointBase } from '@/types/ficha';

export type FichaDataPoint = FichaDataPointBase;

export interface FichasDataResult {
  fichas: FichaDataPoint[];
  total: number;
  loaded: Date;
}

/**
 * Load fichas data from Google Sheets
 * Returns array of fichas with lat/lng coordinates
 */
export async function loadFichasData(): Promise<FichasDataResult> {
  try {
    console.log('📥 [Fichas Data] Loading fichas from Google Sheets...');
    
    const fichas = await fetchFichasData();
    
    console.log(`✅ [Fichas Data] Loaded ${fichas.length} fichas with coordinates`);
    
    return {
      fichas: fichas as FichaDataPoint[],
      total: fichas.length,
      loaded: new Date(),
    };
  } catch (error) {
    console.error('❌ [Fichas Data] Error loading fichas:', error);
    throw error;
  }
}

/**
 * Filter fichas by bounding box
 * Used internally by selection module
 */
export function filterFichasByBounds(
  fichas: FichaDataPoint[],
  bounds: { north: number; south: number; east: number; west: number }
): FichaDataPoint[] {
  return fichas.filter(ficha => {
    const lat = ficha.lat || ficha.latitude;
    const lng = ficha.lng || ficha.longitude;
    return (
      lat !== undefined &&
      lng !== undefined &&
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  });
}

/**
 * Group fichas by projeto
 */
export function groupByProjeto(fichas: FichaDataPoint[]): Map<string, FichaDataPoint[]> {
  const groups = new Map<string, FichaDataPoint[]>();
  
  fichas.forEach(ficha => {
    const projeto = ficha.projeto || 'Sem Projeto';
    if (!groups.has(projeto)) {
      groups.set(projeto, []);
    }
    const arr = groups.get(projeto);
    if (arr) {
      arr.push(ficha);
    } else {
      // This should not happen, but handle gracefully
      groups.set(projeto, [ficha]);
    }
  });
  
  return groups;
}

/**
 * Group fichas by scouter
 */
export function groupByScouter(fichas: FichaDataPoint[]): Map<string, FichaDataPoint[]> {
  const groups = new Map<string, FichaDataPoint[]>();
  
  fichas.forEach(ficha => {
    const scouter = ficha.scouter || 'Sem Scouter';
    if (!groups.has(scouter)) {
      groups.set(scouter, []);
    }
    groups.get(scouter)!.push(ficha);
  });
  
  return groups;
}
