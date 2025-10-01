/**
 * Fichas Selection Module
 * Handles spatial selection using polygon or rectangle drawing
 * Uses Turf.js for spatial filtering
 */

import L from 'leaflet';
import * as turf from '@turf/turf';
import { FichaDataPoint } from './data';

export type SelectionShape = 'rectangle' | 'polygon';

export interface SelectionResult {
  shape: SelectionShape;
  fichas: FichaDataPoint[];
  bounds: L.LatLngBounds | null;
  polygon: L.LatLng[] | null;
}

export class FichasSelection {
  private map: L.Map;
  private allFichas: FichaDataPoint[];
  private drawLayer: L.LayerGroup;
  private currentShape: L.Rectangle | L.Polygon | null = null;
  private onSelectionComplete?: (result: SelectionResult) => void;

  constructor(
    map: L.Map,
    fichas: FichaDataPoint[],
    onSelectionComplete?: (result: SelectionResult) => void
  ) {
    this.map = map;
    this.allFichas = fichas;
    this.drawLayer = L.layerGroup().addTo(map);
    this.onSelectionComplete = onSelectionComplete;
  }

  /**
   * Start rectangle selection mode
   */
  startRectangleSelection(): void {
    console.log('📐 [Fichas Selection] Starting rectangle selection...');
    
    // Clear previous selection
    this.clearSelection();
    
    // Change cursor to crosshair
    this.map.getContainer().style.cursor = 'crosshair';
    
    let startLatLng: L.LatLng | null = null;
    let rectangle: L.Rectangle | null = null;

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      startLatLng = e.latlng;
      
      // Create initial rectangle
      rectangle = L.rectangle([startLatLng, startLatLng], {
        color: '#3B82F6',
        weight: 2,
        fillOpacity: 0.1
      }).addTo(this.drawLayer);
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (startLatLng && rectangle) {
        rectangle.setBounds([startLatLng, e.latlng]);
      }
    };

    const onMouseUp = (e: L.LeafletMouseEvent) => {
      if (startLatLng && rectangle) {
        const bounds = L.latLngBounds([startLatLng, e.latlng]);
        this.currentShape = rectangle;
        
        // Filter fichas within bounds
        const selectedFichas = this.filterByRectangle(bounds);
        
        // Cleanup event listeners
        this.map.off('mousedown', onMouseDown);
        this.map.off('mousemove', onMouseMove);
        this.map.off('mouseup', onMouseUp);
        this.map.getContainer().style.cursor = '';
        
        console.log(`✅ [Fichas Selection] Rectangle selection complete: ${selectedFichas.length} fichas`);
        
        // Notify completion
        if (this.onSelectionComplete) {
          this.onSelectionComplete({
            shape: 'rectangle',
            fichas: selectedFichas,
            bounds,
            polygon: null
          });
        }
      }
    };

    // Attach event listeners
    this.map.on('mousedown', onMouseDown);
    this.map.on('mousemove', onMouseMove);
    this.map.on('mouseup', onMouseUp);
  }

  /**
   * Start polygon selection mode (simplified - draws vertices on clicks)
   */
  startPolygonSelection(): void {
    console.log('📐 [Fichas Selection] Starting polygon selection...');
    
    // Clear previous selection
    this.clearSelection();
    
    // Change cursor to crosshair
    this.map.getContainer().style.cursor = 'crosshair';
    
    const vertices: L.LatLng[] = [];
    let polygon: L.Polygon | null = null;

    const onClick = (e: L.LeafletMouseEvent) => {
      // Add vertex
      vertices.push(e.latlng);
      
      // Update or create polygon
      if (polygon) {
        polygon.setLatLngs(vertices);
      } else {
        polygon = L.polygon(vertices, {
          color: '#3B82F6',
          weight: 2,
          fillOpacity: 0.1
        }).addTo(this.drawLayer);
      }
      
      console.log(`📍 [Fichas Selection] Added vertex ${vertices.length}`);
    };

    const onDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      
      if (vertices.length < 3) {
        console.warn('⚠️ [Fichas Selection] Polygon needs at least 3 vertices');
        return;
      }
      
      // Complete polygon selection
      this.currentShape = polygon;
      
      // Filter fichas within polygon
      const selectedFichas = this.filterByPolygon(vertices);
      
      // Cleanup event listeners
      this.map.off('click', onClick);
      this.map.off('dblclick', onDblClick);
      this.map.getContainer().style.cursor = '';
      
      console.log(`✅ [Fichas Selection] Polygon selection complete: ${selectedFichas.length} fichas`);
      
      // Notify completion
      if (this.onSelectionComplete) {
        this.onSelectionComplete({
          shape: 'polygon',
          fichas: selectedFichas,
          bounds: polygon ? polygon.getBounds() : null,
          polygon: vertices
        });
      }
    };

    // Attach event listeners
    this.map.on('click', onClick);
    this.map.on('dblclick', onDblClick);
  }

  /**
   * Filter fichas within rectangle bounds
   */
  private filterByRectangle(bounds: L.LatLngBounds): FichaDataPoint[] {
    return this.allFichas.filter(ficha => {
      return bounds.contains([ficha.lat, ficha.lng]);
    });
  }

  /**
   * Filter fichas within polygon using Turf.js
   */
  private filterByPolygon(vertices: L.LatLng[]): FichaDataPoint[] {
    // Convert Leaflet polygon to GeoJSON polygon for Turf
    const coordinates = vertices.map(v => [v.lng, v.lat]);
    // Close the polygon by adding first point at the end
    coordinates.push(coordinates[0]);
    
    const polygon = turf.polygon([coordinates]);
    
    return this.allFichas.filter(ficha => {
      const point = turf.point([ficha.lng, ficha.lat]);
      return turf.booleanPointInPolygon(point, polygon);
    });
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this.drawLayer.clearLayers();
    this.currentShape = null;
    this.map.getContainer().style.cursor = '';
    console.log('🧹 [Fichas Selection] Selection cleared');
  }

  /**
   * Cancel ongoing selection
   */
  cancelSelection(): void {
    // Remove all event listeners
    this.map.off('mousedown');
    this.map.off('mousemove');
    this.map.off('mouseup');
    this.map.off('click');
    this.map.off('dblclick');
    
    this.clearSelection();
    console.log('❌ [Fichas Selection] Selection cancelled');
  }

  /**
   * Update fichas data
   */
  updateFichas(fichas: FichaDataPoint[]): void {
    this.allFichas = fichas;
  }

  /**
   * Destroy selection instance
   */
  destroy(): void {
    this.cancelSelection();
    this.map.removeLayer(this.drawLayer);
    console.log('💥 [Fichas Selection] Instance destroyed');
  }
}

/**
 * Create a new selection instance
 */
export function createFichasSelection(
  map: L.Map,
  fichas: FichaDataPoint[],
  onSelectionComplete?: (result: SelectionResult) => void
): FichasSelection {
  return new FichasSelection(map, fichas, onSelectionComplete);
}
