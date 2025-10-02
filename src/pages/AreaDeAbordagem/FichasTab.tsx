/**
 * FichasTab Component - Area Analysis with AI Q&A (Point 3)
 * - Reintroduz toggle manual (botão cérebro)
 * - Adiciona suporte para Q&A via AdvancedSummary (centerLatLng)
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import * as turf from '@turf/turf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, RefreshCw, X, Navigation, Flame, Maximize2, Minimize2, Brain } from 'lucide-react';
import { useFichasFromSheets } from '@/hooks/useFichasFromSheets';
import { getTileServerConfig, DEFAULT_TILE_SERVER } from '@/config/tileServers';
import type { FichaMapData } from '@/services/googleSheetsMapService';
import { DateFilter } from '@/components/FichasMap/DateFilter';
import { AdvancedSummary } from '@/components/FichasMap/AdvancedSummary';
import { lockMap, unlockMap, bboxFilter, pointsInPolygon } from '@/utils/map-helpers';
import { buildAISummaryFromSelection, formatAIAnalysisHTML } from '@/utils/ai-analysis';
import { exportAreaReportPDF, exportAreaReportCSV } from '@/utils/export-reports';
import './mobile.css';

// Geoman types
 type GeomanMap = L.Map & {
  pm?: {
    setPathOptions: (options: Record<string, unknown>) => void;
    enableDraw: (shape: string, options: Record<string, unknown>) => void;
    disableDraw: () => void;
    globalDrawModeEnabled: () => boolean;
  };
};

 interface GeomanCreateEvent {
  layer: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
    getBounds: () => L.LatLngBounds;
  };
  shape: string;
}

 interface GeomanDrawVertexEvent {
  workingLayer?: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
    getBounds: () => L.LatLngBounds;
  };
  layer?: L.Layer & {
    getLatLngs: () => Array<Array<{ lat: number; lng: number }>>;
    getBounds: () => L.LatLngBounds;
  };
}

// Extended ficha type with metadata
 interface FichaDataPoint extends FichaMapData {
  id?: string;
  projeto?: string;
  scouter?: string;
  data?: string;
}

 interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

 interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
}

// Format large numbers with K suffix
 function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

 export function FichasTab() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const drawnLayerRef = useRef<L.Layer | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const heatSelectedRef = useRef<L.HeatLayer | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [allFichas, setAllFichas] = useState<FichaDataPoint[]>([]);
  const [filteredFichas, setFilteredFichas] = useState<FichaDataPoint[]>([]);
  const [displayedFichas, setDisplayedFichas] = useState<FichaDataPoint[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Date filter state
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [hasDateFilter, setHasDateFilter] = useState(false);

  const { fichas, isLoading, error, refetch, isFetching } = useFichasFromSheets();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11);
    const tileConfig = getTileServerConfig(DEFAULT_TILE_SERVER);
    L.tileLayer(tileConfig.url, { attribution: tileConfig.attribution, maxZoom: tileConfig.maxZoom }).addTo(map);
    mapRef.current = map;
    return () => {
      clusterGroupRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Map container class for drawing
  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (!container) return;
    if (isDrawing) container.classList.add('drawing-mode'); else container.classList.remove('drawing-mode');
  }, [isDrawing]);

  // Load fichas
  useEffect(() => {
    if (!fichas || fichas.length === 0) {
      setAllFichas([]); setFilteredFichas([]); setDisplayedFichas([]); setSummary(null); setShowSummary(false); return;
    }
    const enriched: FichaDataPoint[] = fichas.map((f, i) => ({ ...f, id: `ficha-${i}`, projeto: f.projeto || 'Sem Projeto', scouter: f.scouter || 'Não Identificado', data: f.data || '' }));
    setAllFichas(enriched);
    setFilteredFichas(enriched);
    setDisplayedFichas(enriched);
    setSummary(generateAnalysis(enriched));
  }, [fichas]);

  // Heat layer base
  useEffect(() => {
    if (!mapRef.current || filteredFichas.length === 0) {
      if (heatLayerRef.current) { mapRef.current?.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
      if (heatSelectedRef.current) { mapRef.current?.removeLayer(heatSelectedRef.current); heatSelectedRef.current = null; }
      return;
    }
    if (heatLayerRef.current) { mapRef.current.removeLayer(heatLayerRef.current); }
    // @ts-ignore
    heatLayerRef.current = L.heatLayer(filteredFichas.map(f => [f.lat, f.lng, 1]), {
      radius: 25, blur: 35, maxZoom: 19, max: 1.0, minOpacity: 0.3,
      gradient: { 0.0: '#4ade80', 0.5: '#fbbf24', 0.8: '#f97316', 1.0: '#ef4444' }
    });
    mapRef.current.addLayer(heatLayerRef.current);
  }, [filteredFichas]);

  // Clusters
  useEffect(() => {
    if (!mapRef.current || displayedFichas.length === 0) {
      if (clusterGroupRef.current) { mapRef.current?.removeLayer(clusterGroupRef.current); clusterGroupRef.current = null; }
      return;
    }
    if (clusterGroupRef.current) { mapRef.current.removeLayer(clusterGroupRef.current); }
    const clusterGroup = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60, spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true, iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount(); let size = 'small'; if (count >= 100) size = 'large'; else if (count >= 10) size = 'medium';
      return L.divIcon({ html: `<div style="background-color:#FF6B35;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:3px solid white;">${formatK(count)}</div>`, className: `marker-cluster marker-cluster-${size}`, iconSize: L.point(40, 40) }); } });
    displayedFichas.forEach(f => {
      const marker = L.circleMarker([f.lat, f.lng], { radius: 6, fillColor: '#FF6B35', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8 });
      marker.bindPopup(`<div style="font-family:system-ui;padding:4px;"><strong>Ficha</strong><br/><small>Projeto: ${f.projeto || 'N/A'}</small><br/><small>Scouter: ${f.scouter || 'N/A'}</small><br/><small>${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}</small></div>`);
      clusterGroup.addLayer(marker);
    });
    mapRef.current.addLayer(clusterGroup); clusterGroupRef.current = clusterGroup;
    if (displayedFichas.length === filteredFichas.length && displayedFichas.length > 0) {
      const bounds = L.latLngBounds(displayedFichas.map(f => [f.lat, f.lng])); mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [displayedFichas, filteredFichas]);

  // Drawing events
  useEffect(() => {
    const map = mapRef.current as GeomanMap; if (!map || !map.pm) return;
    const onDrawStart = () => {
      if (map) lockMap(map as L.Map); setIsDrawing(true);
      if (!heatSelectedRef.current) {
        // @ts-ignore
        heatSelectedRef.current = L.heatLayer([], { radius: 20, blur: 30, maxZoom: 19, max: 1.0, minOpacity: 0.4, gradient: { 0.0: '#3b82f6', 0.5: '#8b5cf6', 0.8: '#ec4899', 1.0: '#ef4444' } });
        map.addLayer(heatSelectedRef.current);
      }
    };
    const onDrawVertex = (e: GeomanDrawVertexEvent) => {
      const shape = e.workingLayer || e.layer; if (!shape || !heatSelectedRef.current) return;
      const latLngs = shape.getLatLngs?.()[0]; if (!latLngs || latLngs.length < 3) return;
      const bounds = shape.getBounds(); const candidates = bboxFilter(filteredFichas, bounds);
      const coords = latLngs.map((p: L.LatLng) => [p.lng, p.lat]); coords.push(coords[0]);
      const polygon = turf.polygon([coords]);
      const selected = pointsInPolygon(candidates, polygon);
      const heatPoints = selected.map(f => [f.lat, f.lng, 1] as [number, number, number]);
      heatSelectedRef.current.setLatLngs(heatPoints);
    };
    const onCreate = (e: GeomanCreateEvent) => {
      if (drawnLayerRef.current) map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = e.layer; setIsDrawing(false); if (map) unlockMap(map as L.Map); map.pm.disableDraw();
      const latlngs = e.layer.getLatLngs()[0]; const coords = latlngs.map(p => [p.lng, p.lat]); coords.push(coords[0]);
      const bounds = e.layer.getBounds(); const candidates = bboxFilter(filteredFichas, bounds);
      const polygon = turf.polygon([coords]); const selected = pointsInPolygon(candidates, polygon);
      setDisplayedFichas(selected); setSummary(generateAnalysis(selected));
      // NÃO abrir automaticamente: usuário decide via botão cérebro
    };
    const onDrawCancel = () => {
      setIsDrawing(false); if (map) unlockMap(map as L.Map);
      if (heatSelectedRef.current) { map.removeLayer(heatSelectedRef.current); heatSelectedRef.current = null; }
    };
    map.on('pm:drawstart', onDrawStart);
    map.on('pm:drawvertex', onDrawVertex);
    map.on('pm:markerdragend', onDrawVertex);
    map.on('pm:create', onCreate);
    map.on('pm:drawcancel', onDrawCancel);
    return () => {
      map.off('pm:drawstart', onDrawStart);
      map.off('pm:drawvertex', onDrawVertex);
      map.off('pm:markerdragend', onDrawVertex);
      map.off('pm:create', onCreate);
      map.off('pm:drawcancel', onDrawCancel);
    };
  }, [filteredFichas]);

  const generateAnalysis = (fichas: FichaDataPoint[]): AnalysisSummary => {
    const projetoMap = new Map<string, Map<string, number>>();
    fichas.forEach(f => {
      const projeto = f.projeto || 'Sem Projeto'; const sc = f.scouter || 'Não Identificado';
      if (!projetoMap.has(projeto)) projetoMap.set(projeto, new Map());
      const scMap = projetoMap.get(projeto)!; scMap.set(sc, (scMap.get(sc) || 0) + 1);
    });
    const byProjeto: ProjetoSummary[] = [];
    projetoMap.forEach((scMap, projeto) => {
      let total = 0; scMap.forEach(c => { total += c; });
      byProjeto.push({ projeto, total, byScout: scMap });
    });
    byProjeto.sort((a,b)=> b.total - a.total);
    return { total: fichas.length, byProjeto };
  };

  const handleStartDrawing = () => {
    const map = mapRef.current as GeomanMap; if (!map?.pm) return;
    setShowSummary(false); setIsDrawing(true);
    if (map.pm.globalDrawModeEnabled()) map.pm.disableDraw();
    map.pm.setPathOptions({ color: '#4096ff', fillColor: '#4096ff', fillOpacity: 0.1, weight: 2 });
    map.pm.enableDraw('Polygon', { snappable: true, snapDistance: 25, allowSelfIntersection: false, finishOnDoubleClick: true, tooltips: true });
  };

  const handleClearSelection = () => {
    const map = mapRef.current;
    if (drawnLayerRef.current && map) { map.removeLayer(drawnLayerRef.current); drawnLayerRef.current = null; }
    if (heatSelectedRef.current && map) { map.removeLayer(heatSelectedRef.current); heatSelectedRef.current = null; }
    setDisplayedFichas(filteredFichas); setSummary(generateAnalysis(filteredFichas)); setIsDrawing(false); setShowSummary(false); if (map) unlockMap(map as L.Map);
  };

  const handleCenterMap = () => {
    if (!mapRef.current || displayedFichas.length === 0) return;
    const bounds = L.latLngBounds(displayedFichas.map(f => [f.lat, f.lng])); mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleDateChange = (start: string, end: string) => { setDateStart(start); setDateEnd(end); };
  const handleApplyDateFilter = () => {
    if (!dateStart || !dateEnd) return;
    const parseBrazilianDate = (dateStr: string): Date | null => {
      if (!dateStr) return null; const m = dateStr.match(/^(\\d{2})\/(\\d{2})\/(\\d{4})$/); if (m) { const [, d, mo, y] = m; return new Date(Number(y), Number(mo)-1, Number(d)); }
      const iso = new Date(dateStr); return isNaN(iso.getTime()) ? null : iso; };
    const filtered = allFichas.filter(f => { if (!f.data) return false; const fd = parseBrazilianDate(f.data); if (!fd) return false; const s = new Date(dateStart); const e = new Date(dateEnd + 'T23:59:59'); return fd >= s && fd <= e; });
    setFilteredFichas(filtered); setDisplayedFichas(filtered); setSummary(generateAnalysis(filtered)); setHasDateFilter(true); setShowSummary(false);
  };
  const handleClearDateFilter = () => { setDateStart(''); setDateEnd(''); setFilteredFichas(allFichas); setDisplayedFichas(allFichas); setSummary(generateAnalysis(allFichas)); setHasDateFilter(false); setShowSummary(false); };

  const handleToggleFullscreen = () => {
    const wrapper = mapWrapperRef.current; if (!wrapper) return;
    if (!document.fullscreenElement) { wrapper.requestFullscreen?.().then(()=> { setIsFullscreen(true); setTimeout(()=> mapRef.current?.invalidateSize(), 100); }).catch(console.error); }
    else { document.exitFullscreen?.().then(()=> { setIsFullscreen(false); setTimeout(()=> mapRef.current?.invalidateSize(), 100); }); }
  };

  useEffect(() => { const onFS = () => { setIsFullscreen(!!document.fullscreenElement); setTimeout(()=> mapRef.current?.invalidateSize(), 100); }; document.addEventListener('fullscreenchange', onFS); return () => document.removeEventListener('fullscreenchange', onFS); }, []);

  const handleExportPDF = async () => {
    if (!summary || !mapContainerRef.current) return; setIsExporting(true);
    try { const map = mapRef.current; if (!map) throw new Error('Map not initialized'); const center = map.getCenter(); const zoom = map.getZoom(); const bounds = map.getBounds(); const sw = bounds.getSouthWest(); const ne = bounds.getNorthEast(); const metadata = { timestamp: new Date().toLocaleString('pt-BR'), center: { lat: center.lat, lng: center.lng }, zoom, bbox: `${sw.lat.toFixed(4)},${sw.lng.toFixed(4)} to ${ne.lat.toFixed(4)},${ne.lng.toFixed(4)}`, totalPoints: summary.total }; const aiAnalysis = buildAISummaryFromSelection(summary, center.lat, center.lng); const aiHTML = formatAIAnalysisHTML(aiAnalysis); await exportAreaReportPDF(mapContainerRef.current, summary, metadata, aiHTML); } catch (e) { console.error('Erro PDF:', e); alert('Erro ao gerar relatório PDF.'); } finally { setIsExporting(false); } };
  const handleExportCSV = () => { if (!summary) return; try { exportAreaReportCSV(summary); } catch (e) { console.error('Erro CSV:', e); alert('Erro ao gerar relatório CSV.'); } };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle>Fichas - Análise de Área</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {displayedFichas.length === filteredFichas.length ? `${formatK(displayedFichas.length)} fichas${hasDateFilter ? ' (filtradas)' : ' total'}` : `${formatK(displayedFichas.length)} de ${formatK(filteredFichas.length)} selecionadas`}
            </span>
            <Button variant={isDrawing ? 'default' : 'outline'} size="default" onClick={handleStartDrawing} disabled={isDrawing || filteredFichas.length === 0} className="min-w-[44px] min-h-[44px]" title={isDrawing ? 'Desenhando... (duplo clique para finalizar)' : 'Desenhar área'}>
              <Pencil className="h-4 w-4 mr-2" /> {isDrawing ? 'Desenhando...' : 'Desenhar'}
            </Button>
            <Button variant="outline" size="default" onClick={handleClearSelection} disabled={displayedFichas.length === filteredFichas.length} className="min-w-[44px] min-h-[44px]" title="Limpar seleção">
              <X className="h-4 w-4 mr-2" /> Limpar
            </Button>
            <Button variant="outline" size="default" onClick={handleCenterMap} disabled={displayedFichas.length === 0} className="min-w-[44px] min-h-[44px]" title="Centralizar mapa">
              <Navigation className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="default" onClick={() => refetch()} disabled={isLoading || isFetching} className="min-w-[44px] min-h-[44px]" title="Recarregar dados">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {(isLoading || isFetching) && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
        {error && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"><p className="text-sm text-destructive">Erro ao carregar fichas</p></div>}
        <div className="absolute top-4 right-4 z-[9999] flex flex-col bg-white/95 shadow-lg border backdrop-blur-sm rounded overflow-hidden">
          <DateFilter startDate={dateStart} endDate={dateEnd} onDateChange={handleDateChange} onApply={handleApplyDateFilter} onClear={handleClearDateFilter} />
          <div className="h-px bg-border" />
          <button className="fullscreen-button flex items-center justify-center w-[30px] h-[30px] hover:bg-accent transition-colors" onClick={handleToggleFullscreen} title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Botão cérebro */}
        <div className="absolute bottom-4 right-4 z-[1100] flex flex-col items-end gap-1">
          <button
            disabled={!summary}
            onClick={() => setShowSummary(o => !o)}
            className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center border transition ${showSummary ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-gray-50'} disabled:opacity-40`}
            title={showSummary ? 'Fechar análise' : 'Abrir análise'}
          >
            <Brain className="h-6 w-6" />
          </button>
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Análise</span>
        </div>

        {showSummary && summary && (
          <AdvancedSummary
            summary={summary}
            aiAnalysisHTML={formatAIAnalysisHTML(
              buildAISummaryFromSelection(
                summary,
                mapRef.current?.getCenter().lat,
                mapRef.current?.getCenter().lng
              )
            )}
            onClose={() => setShowSummary(false)}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            isExporting={isExporting}
            centerLatLng={mapRef.current ? { lat: mapRef.current.getCenter().lat, lng: mapRef.current.getCenter().lng } : undefined}
          />
        )}

        <div ref={mapWrapperRef} className="fullscreen-container w-full h-full min-h-[500px]">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}