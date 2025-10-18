/**
 * Fichas Module - Main Entry Point
 * 
 * Complete module for fichas visualization with:
 * - Data loading from Supabase
 * - Persistent heatmap at all zoom levels
 * - Spatial selection (rectangle/polygon)
 * - Summary by projeto and scouter
 */

// Export all modules
export * from './data';
export * from './heat';
export * from './selection';
export * from './summary';

// Re-export for convenience
export { loadFichasData, type FichaDataPoint, type FichasDataResult } from './data';
export { createFichasHeatmap, type HeatmapOptions, FichasHeatmap } from './heat';
export { createFichasSelection, type SelectionResult, FichasSelection } from './selection';
export { generateSummary, formatSummaryText, generateSummaryHTML, type FichasSummaryData } from './summary';
