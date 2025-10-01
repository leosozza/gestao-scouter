/**
 * Fichas Heatmap Module
 * Manages persistent heatmap visualization using leaflet.heat
 * Heatmap persists across all zoom levels
 */

import L from 'leaflet';
import 'leaflet.heat';
import { FichaDataPoint } from './data';

export interface HeatmapOptions {
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  gradient?: Record<number, string>;
}

const DEFAULT_HEATMAP_OPTIONS: HeatmapOptions = {
  radius: 25,
  blur: 15,
  maxZoom: 18, // Increased to persist at all zoom levels
  max: 1.0,
  gradient: {
    0.0: 'green',
    0.5: 'yellow',
    1.0: 'red'
  }
};

export class FichasHeatmap {
  private map: L.Map;
  private heatLayer: L.HeatLayer | null = null;
  private currentData: FichaDataPoint[] = [];
  private options: HeatmapOptions;

  constructor(map: L.Map, options?: HeatmapOptions) {
    this.map = map;
    this.options = { ...DEFAULT_HEATMAP_OPTIONS, ...options };
  }

  /**
   * Update heatmap with new data
   * Removes old layer and creates new one with updated data
   */
  updateData(fichas: FichaDataPoint[]): void {
    console.log(`🔥 [Fichas Heatmap] Updating heatmap with ${fichas.length} points`);
    
    this.currentData = fichas;
    
    // Remove existing heat layer
    this.clear();
    
    if (fichas.length === 0) {
      console.log('⚠️ [Fichas Heatmap] No data to display');
      return;
    }

    // Create heat layer points: [lat, lng, intensity]
    const points: [number, number, number][] = fichas.map(ficha => [
      ficha.lat,
      ficha.lng,
      1 // Default intensity, can be customized based on ficha properties
    ]);

    // @ts-expect-error - leaflet.heat typing issue
    this.heatLayer = L.heatLayer(points, {
      radius: this.options.radius,
      blur: this.options.blur,
      maxZoom: this.options.maxZoom,
      max: this.options.max,
      gradient: this.options.gradient
    }).addTo(this.map);

    console.log('✅ [Fichas Heatmap] Heatmap layer created successfully');
  }

  /**
   * Clear heatmap layer from map
   */
  clear(): void {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
      this.heatLayer = null;
      console.log('🧹 [Fichas Heatmap] Heatmap cleared');
    }
  }

  /**
   * Update heatmap options without reloading data
   */
  updateOptions(options: Partial<HeatmapOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Reload heatmap with new options
    if (this.currentData.length > 0) {
      this.updateData(this.currentData);
    }
  }

  /**
   * Get current data count
   */
  getDataCount(): number {
    return this.currentData.length;
  }

  /**
   * Check if heatmap is currently visible
   */
  isVisible(): boolean {
    return this.heatLayer !== null;
  }

  /**
   * Fit map bounds to show all heatmap points
   */
  fitBounds(padding?: [number, number]): void {
    if (this.currentData.length === 0) {
      console.warn('⚠️ [Fichas Heatmap] No data to fit bounds');
      return;
    }

    const points: [number, number][] = this.currentData.map(ficha => [
      ficha.lat,
      ficha.lng
    ]);

    const bounds = L.latLngBounds(points);
    this.map.fitBounds(bounds, { padding: padding || [50, 50] });
    
    console.log('📍 [Fichas Heatmap] Map bounds fitted to data');
  }

  /**
   * Destroy heatmap instance
   */
  destroy(): void {
    this.clear();
    this.currentData = [];
    console.log('💥 [Fichas Heatmap] Instance destroyed');
  }
}

/**
 * Create a new heatmap instance
 */
export function createFichasHeatmap(
  map: L.Map,
  options?: HeatmapOptions
): FichasHeatmap {
  return new FichasHeatmap(map, options);
}
