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

// Mock data for testing when Google Sheets is unavailable
const MOCK_SCOUTERS: ScouterMapData[] = [
  { nome: 'João Silva', lat: -23.5505, lng: -46.6333, geolocalizacao: '-23.5505,-46.6333' },
  { nome: 'Maria Santos', lat: -23.5489, lng: -46.6388, geolocalizacao: '-23.5489,-46.6388' },
  { nome: 'Pedro Costa', lat: -23.5558, lng: -46.6396, geolocalizacao: '-23.5558,-46.6396' },
  { nome: 'Ana Lima', lat: -23.5629, lng: -46.6544, geolocalizacao: '-23.5629,-46.6544' },
  { nome: 'Carlos Souza', lat: -23.5475, lng: -46.6361, geolocalizacao: '-23.5475,-46.6361' },
];

const MOCK_FICHAS: FichaMapData[] = [
  { lat: -23.5505, lng: -46.6333, localizacao: '-23.5505,-46.6333' },
  { lat: -23.5520, lng: -46.6350, localizacao: '-23.5520,-46.6350' },
  { lat: -23.5535, lng: -46.6370, localizacao: '-23.5535,-46.6370' },
  { lat: -23.5550, lng: -46.6390, localizacao: '-23.5550,-46.6390' },
  { lat: -23.5565, lng: -46.6410, localizacao: '-23.5565,-46.6410' },
  { lat: -23.5580, lng: -46.6430, localizacao: '-23.5580,-46.6430' },
  { lat: -23.5595, lng: -46.6450, localizacao: '-23.5595,-46.6450' },
];

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
  
  // Relaxed validation - accept any valid world coordinates
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn(`Invalid coordinates (out of world bounds): ${lat}, ${lng}`);
    return null;
  }
  
  return { lat, lng };
}

/**
 * Fetch CSV data from Google Sheets
 */
async function fetchCsv(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  
  console.log(`Fetching CSV from: ${url}`);
  
  try {
    const response = await fetch(url, { 
      mode: 'cors',
      cache: 'no-store',
      headers: {
        'Accept': 'text/csv',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    console.log(`Successfully fetched CSV, length: ${text.length} chars`);
    return text;
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
    console.log('🗺️ Fetching scouters data from Google Sheets...');
    const csvText = await fetchCsv(CSV_SCOUTERS_GID);
    const rows = parseCsvToObjects(csvText);
    
    console.log(`📊 Parsed ${rows.length} rows from Scouters sheet`);
    if (rows.length > 0) {
      console.log('📋 First row sample:', rows[0]);
      console.log('📋 Available columns:', Object.keys(rows[0]));
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
        console.warn(`⚠️ Invalid coordinates for scouter ${nome}: ${geolocalizacao}`);
      }
    }
    
    console.log(`✅ Successfully parsed ${scouters.length} scouters with valid coordinates`);
    
    // If no scouters found, return mock data for testing
    if (scouters.length === 0) {
      console.warn('⚠️ No scouters found in Google Sheets, using mock data for testing');
      return MOCK_SCOUTERS;
    }
    
    return scouters;
  } catch (error) {
    console.error('❌ Error fetching scouters data from Google Sheets:', error);
    console.log('🔄 Falling back to mock data for testing');
    return MOCK_SCOUTERS;
  }
}

/**
 * Fetch fichas data from Google Sheets
 * Column L contains "Localização" in format "lat,lng"
 */
export async function fetchFichasData(): Promise<FichaMapData[]> {
  try {
    console.log('🗺️ Fetching fichas data from Google Sheets...');
    const csvText = await fetchCsv(CSV_FICHAS_GID);
    const rows = parseCsvToObjects(csvText);
    
    console.log(`📊 Parsed ${rows.length} rows from Fichas sheet`);
    if (rows.length > 0) {
      console.log('📋 First row sample:', rows[0]);
      console.log('📋 Available columns:', Object.keys(rows[0]));
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
    
    console.log(`✅ Successfully parsed ${fichas.length} fichas with valid coordinates`);
    
    // If no fichas found, return mock data for testing
    if (fichas.length === 0) {
      console.warn('⚠️ No fichas found in Google Sheets, using mock data for testing');
      return MOCK_FICHAS;
    }
    
    return fichas;
  } catch (error) {
    console.error('❌ Error fetching fichas data from Google Sheets:', error);
    console.log('🔄 Falling back to mock data for testing');
    return MOCK_FICHAS;
  }
}
