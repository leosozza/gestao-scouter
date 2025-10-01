/**
 * Google Sheets Map Service
 * Fetches and parses data directly from Google Sheets for map visualization
 * Designed to be easily replaceable with Supabase in the future
 */

const SHEET_ID = '14l4A_BOFZM-TwLuam-bKzUgInNAA7fOCeamdkE1nt_o';
const CSV_SCOUTERS_GID = '1351167110'; // Aba "Scouter"
const CSV_FICHAS_GID = '452792639';     // Aba "Fichas"

export interface ScouterMapData {
  nome: string;
  lat: number;
  lng: number;
  geolocalizacao: string;
}

export interface FichaMapData {
  lat: number;
  lng: number;
  localizacao: string;
}

/**
 * Parse lat,lng string format
 * Handles formats like "-23.507144,-46.846307" or "-23.507144, -46.846307"
 */
export function parseLatLng(coordStr: string): { lat: number; lng: number } | null {
  if (!coordStr || typeof coordStr !== 'string') return null;
  
  // Remove extra spaces and parentheses
  const cleaned = coordStr.trim().replace(/[()]/g, '');
  
  // Match format: number, number (with optional spaces)
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  
  if (!match) return null;
  
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  
  // Basic validation for Brazil coordinates
  if (lat < -35 || lat > 5 || lng < -75 || lng > -30) {
    console.warn(`Invalid coordinates for Brazil: ${lat}, ${lng}`);
    return null;
  }
  
  return { lat, lng };
}

/**
 * Fetch CSV data from Google Sheets
 */
async function fetchCsv(gid: string): Promise<string> {
  // Use proxy in development to avoid CORS issues
  const url = import.meta.env.DEV
    ? `/api/sheets/${SHEET_ID}/${gid}`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  
  try {
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching CSV for GID ${gid}:`, error);
    throw error;
  }
}

/**
 * Parse CSV line handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse CSV text into array of objects
 */
function parseCsvToObjects(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    console.warn('CSV has insufficient data');
    return [];
  }
  
  // First line is headers
  const headers = parseCsvLine(lines[0]);
  console.log('CSV Headers:', headers);
  
  // Parse data rows
  const data: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Fetch scouters data from Google Sheets
 * Column C contains "geolocalizacao" in format "lat,lng"
 */
export async function fetchScoutersData(): Promise<ScouterMapData[]> {
  try {
    console.log('Fetching scouters data from Google Sheets...');
    const csvText = await fetchCsv(CSV_SCOUTERS_GID);
    const rows = parseCsvToObjects(csvText);
    
    console.log(`Parsed ${rows.length} rows from Scouters sheet`);
    if (rows.length > 0) {
      console.log('First row sample:', rows[0]);
      console.log('Available columns:', Object.keys(rows[0]));
    }
    
    const scouters: ScouterMapData[] = [];
    
    for (const row of rows) {
      // Look for name field - try various possible column names
      const nome = row['Nome'] || row['Scouter'] || row['Nome do Scouter'] || row['nome'] || '';
      
      // Look for geolocation field (column C should be "geolocalizacao")
      const geolocalizacao = row['geolocalizacao'] || row['Geolocalizacao'] || row['Geolocalização'] || '';
      
      if (!nome || !geolocalizacao) {
        continue; // Skip rows without name or location
      }
      
      const coords = parseLatLng(geolocalizacao);
      
      if (coords) {
        scouters.push({
          nome,
          lat: coords.lat,
          lng: coords.lng,
          geolocalizacao,
        });
      } else {
        console.warn(`Invalid coordinates for scouter ${nome}: ${geolocalizacao}`);
      }
    }
    
    console.log(`Successfully parsed ${scouters.length} scouters with valid coordinates`);
    return scouters;
  } catch (error) {
    console.error('Error fetching scouters data:', error);
    throw error;
  }
}

/**
 * Fetch fichas data from Google Sheets
 * Column L contains "Localização" in format "lat,lng"
 */
export async function fetchFichasData(): Promise<FichaMapData[]> {
  try {
    console.log('Fetching fichas data from Google Sheets...');
    const csvText = await fetchCsv(CSV_FICHAS_GID);
    const rows = parseCsvToObjects(csvText);
    
    console.log(`Parsed ${rows.length} rows from Fichas sheet`);
    if (rows.length > 0) {
      console.log('First row sample:', rows[0]);
      console.log('Available columns:', Object.keys(rows[0]));
    }
    
    const fichas: FichaMapData[] = [];
    
    for (const row of rows) {
      // Look for location field (column L should be "Localização")
      const localizacao = row['Localização'] || row['Localizacao'] || row['localização'] || row['localizacao'] || '';
      
      if (!localizacao) {
        continue; // Skip rows without location
      }
      
      const coords = parseLatLng(localizacao);
      
      if (coords) {
        fichas.push({
          lat: coords.lat,
          lng: coords.lng,
          localizacao,
        });
      }
    }
    
    console.log(`Successfully parsed ${fichas.length} fichas with valid coordinates`);
    return fichas;
  } catch (error) {
    console.error('Error fetching fichas data:', error);
    throw error;
  }
}
