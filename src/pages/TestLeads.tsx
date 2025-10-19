/**
 * Test page for Fichas Module with ImovelWeb-style controls
 * Accessible at /test-fichas
 */
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import {
  loadLeadsData,
  createLeadsHeatmap,
  createLeadsSelection,
  generateSummary,
  formatSummaryText,
  type LeadDataPoint,
  type LeadsSummaryData,
  type SelectionResult,
  type LeadsHeatmap,
  type LeadsSelection,
} from "@/map/fichas";
import { AppShell } from "@/layouts/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Calendar, Eye, Pencil, RefreshCw, X, Check, FileText, Maximize2, Minimize2, Flame } from "lucide-react";
// ATENÇÃO: Instale html2pdf.js na sua base (npm i html2pdf.js)
import html2pdf from "html2pdf.js";

function formatK(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function DateRangePicker({ value, onChange }: { value: [string, string]; onChange: (v: [string, string]) => void }) {
  return (
    <div className="flex items-center gap-2 bg-white/90 rounded px-2 py-1 shadow-sm border">
      <Calendar size={16} />
      <input
        type="date"
        value={value[0]}
        onChange={(e) => onChange([e.target.value, value[1]])}
        className="text-xs border-none outline-none bg-transparent"
        style={{ width: 100 }}
      />
      <span className="text-xs">a</span>
      <input
        type="date"
        value={value[1]}
        onChange={(e) => onChange([value[0], e.target.value])}
        className="text-xs border-none outline-none bg-transparent"
        style={{ width: 100 }}
      />
    </div>
  );
}

export default function TestFichasPage() {
  // MODO: 'fichas' ou 'scouter'.
  const [modo, setModo] = useState<'fichas' | 'scouter'>("fichas");

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<LeadsHeatmap | null>(null);
  const selectionRef = useRef<LeadsSelection | null>(null);
  const drawnLayerRef = useRef<L.Layer | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allFichas, setAllFichas] = useState<LeadDataPoint[]>([]);
  const [filteredFichas, setFilteredFichas] = useState<LeadDataPoint[]>([]);
  const [displayedFichas, setDisplayedFichas] = useState<LeadDataPoint[]>([]);
  const [summary, setSummary] = useState<LeadsSummaryData | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Controle de seleção
  const [controlsVisible, setControlsVisible] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return [monthAgo.toISOString().slice(0, 10), now.toISOString().slice(0, 10)];
  });

  // Fullscreen
  const [fullscreen, setFullscreen] = useState(false);

  // Inicialização do mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = L.map(mapContainerRef.current).setView([-23.5505, -46.6333], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(mapRef.current);

    return () => {
      heatmapRef.current?.destroy?.();
      selectionRef.current?.destroy?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/remove drawing-mode class based on isDrawing state
  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (!container) return;
    
    if (isDrawing) {
      container.classList.add('drawing-mode');
    } else {
      container.classList.remove('drawing-mode');
    }
  }, [isDrawing]);

  // Carregar dados e aplicar filtro de datas
  useEffect(() => {
    let canceled = false;
    if (!mapRef.current) return;
    setIsLoading(true);
    setError(null);

    loadLeadsData()
      .then(({ fichas }) => {
        if (canceled) return;
        setAllFichas(fichas);
        // NO INITIAL DATE FILTER - show all fichas on first load
        // Date filter will only be applied when user changes the date range
        setFilteredFichas(fichas);
        setDisplayedFichas(fichas);
        setSummary(generateSummary(fichas));
        // heatmap
        if (mapRef.current) {
          if (heatmapRef.current) {
            heatmapRef.current.updateData(fichas);
            heatmapRef.current.fitBounds();
          } else {
            heatmapRef.current = createLeadsHeatmap(mapRef.current, {
              radius: 14,
              blur: 22,
              max: 0.6,
              minOpacity: 0.25,
              gradient: {
                0.2: "#A7F3D0",
                0.4: "#FDE68A",
                0.7: "#FCA5A5",
                1.0: "#EF4444",
              },
            });
            heatmapRef.current.updateData(fichas);
            heatmapRef.current.fitBounds();
          }
        }
      })
      .catch((e) => setError("Erro ao carregar fichas: " + (e?.message || "")))
      .finally(() => setIsLoading(false));

    return () => {
      canceled = true;
    };
  }, []); // Remove dateRange dependency - only load once on mount

  // Apply date filter when user changes the date range
  useEffect(() => {
    if (allFichas.length === 0) return;
    
    const filtered = allFichas.filter((f) => {
      const dataVal = f.data || (f as any).Data || f["Data"];
      if (!dataVal) return false;
      const dt = new Date(dataVal);
      return (
        dt >= new Date(dateRange[0]) &&
        dt <= new Date(dateRange[1] + "T23:59:59")
      );
    });
    
    setFilteredFichas(filtered);
    setDisplayedFichas(filtered);
    setSummary(generateSummary(filtered));
    
    if (heatmapRef.current && showHeatmap) {
      heatmapRef.current.updateData(filtered);
    }
  }, [dateRange, allFichas, showHeatmap]);

  // Atualizar heatmap e contagem ao mover/zoom no mapa
  useEffect(() => {
    if (!mapRef.current) return;
    const onMove = () => {
      if (!heatmapRef.current) return;
      // mostra só as fichas visíveis no mapa
      const bounds = mapRef.current!.getBounds();
      const visible = filteredFichas.filter((f) =>
        bounds.contains([f.lat, f.lng])
      );
      setDisplayedFichas(visible);
      setSummary(generateSummary(visible));
      if (showHeatmap) {
        heatmapRef.current.updateData(visible);
      }
    };
    mapRef.current.on("moveend zoomend", onMove);
    return () => {
      mapRef.current?.off("moveend zoomend", onMove);
    };
  }, [filteredFichas, showHeatmap]);

  // Geoman event listener para criação de polígono
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map || !map.pm) return;

    const onCreate = (e: any) => {
      // Mantém apenas 1 shape ativo
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
      }
      drawnLayerRef.current = e.layer;
      setIsDrawing(false);
      setSelecting(false);
      map.pm.disableDraw();

      // L.LatLng[] -> GeoJSON [lng, lat]
      const latlngs = e.layer.getLatLngs()[0];
      const coords = latlngs.map((p: any) => [p.lng, p.lat]);
      coords.push(coords[0]); // Close the polygon

      // Usar Turf.js para filtrar pontos dentro do polígono
      // @ts-ignore - Dynamic import
      const turf = await import('@turf/turf');
      const poly = turf.polygon([coords]);

      const selecionados = displayedFichas.filter((ficha) => {
        const point = turf.point([ficha.lng, ficha.lat]);
        return turf.booleanPointInPolygon(point, poly);
      });

      console.log(`✅ [Geoman] Polygon created with ${selecionados.length} fichas selected`);

      setDisplayedFichas(selecionados);
      setSummary(generateSummary(selecionados));
      if (showHeatmap) {
        heatmapRef.current?.updateData(selecionados);
      }
    };

    map.on('pm:create', onCreate);
    return () => { 
      map.off('pm:create', onCreate); 
    };
  }, [displayedFichas, showHeatmap]);

  // Dynamic heatmap options by zoom level
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatmapRef.current) return;

    const updateHeatmapByZoom = () => {
      const zoom = map.getZoom();
      const radius = zoom <= 7 ? 8 : zoom <= 10 ? 18 : zoom <= 12 ? 28 : zoom <= 14 ? 38 : 48;
      const blur = Math.round(radius * 0.6);
      
      heatmapRef.current?.updateOptions({
        radius,
        blur,
        minOpacity: 0.25,
        maxZoom: 19
      });
    };

    map.on('zoomend', updateHeatmapByZoom);
    return () => {
      map.off('zoomend', updateHeatmapByZoom);
    };
  }, []);

  // Seleção poligonal com Geoman
  const handleStartSelection = () => {
    const map = mapRef.current as any;
    if (!map?.pm) {
      console.error('Geoman não carregado (map.pm undefined)');
      return;
    }
    if (!filteredFichas.length) return;
    
    setControlsVisible(false); // fecha painel se existir
    setIsDrawing(true);
    
    // Disable any existing draw mode
    if (map.pm.globalDrawModeEnabled()) {
      map.pm.disableDraw();
    }
    
    // Set drawing style options
    map.pm.setPathOptions({ 
      color: '#4096ff', 
      fillColor: '#4096ff', 
      fillOpacity: 0.1, 
      weight: 2 
    });
    
    // Enable polygon drawing mode
    map.pm.enableDraw('Polygon', {
      snappable: true,
      snapDistance: 25,
      allowSelfIntersection: false,
      finishOnDoubleClick: true,
      tooltips: true
    });
    
    console.log('✏️ [Geoman] Polygon drawing mode activated');
  };

  // Limpar seleção
  const handleClearSelection = () => {
    const map = mapRef.current;
    if (drawnLayerRef.current && map) {
      map.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }
    setDisplayedFichas(filteredFichas);
    setSummary(generateSummary(filteredFichas));
    if (showHeatmap) {
      heatmapRef.current?.updateData(filteredFichas);
    }
    setIsDrawing(false);
    setSelecting(false);
  };

  // Pesquisar nesta área (reset para área visível usando bounds)
  const handleSearchArea = () => {
    const map = mapRef.current;
    if (!map) return;
    
    const bounds = map.getBounds();
    const visibles = filteredFichas.filter((f) =>
      bounds.contains([f.lat, f.lng])
    );
    
    setDisplayedFichas(visibles);
    setSummary(generateSummary(visibles));
    if (showHeatmap) {
      heatmapRef.current?.updateData(visibles);
    }
    setIsDrawing(false);
    setSelecting(false);
  };

  // Aplicar seleção (redundante, já aplica ao finalizar polígono)
  const handleApplySelection = () => {
    setSelecting(false);
    selectionRef.current?.destroy();
  };

  // Toggle heatmap visibility
  const handleToggleHeatmap = () => {
    setShowHeatmap((prev) => {
      const newValue = !prev;
      if (heatmapRef.current) {
        if (newValue) {
          // Show heatmap
          heatmapRef.current.show();
        } else {
          // Hide heatmap
          heatmapRef.current.hide();
        }
      }
      return newValue;
    });
  };

  // Tela cheia
  const handleToggleFullscreen = () => {
    setFullscreen((f) => !f);
    const el = mapContainerRef.current?.parentElement;
    if (!el) return;
    if (!fullscreen) {
      if (el.requestFullscreen) el.requestFullscreen();
    } else {
      if (document.fullscreenElement) document.exitFullscreen();
    }
  };

  // PDF
  const handleGeneratePDF = () => {
    // Renderiza o mapa e o resumo atual
    const mapEl = mapContainerRef.current;
    const summaryHTML = formatSummaryText(summary || { total: 0, byProjeto: [], byScouter: [], topProjeto: null, topScouter: null });
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.top = "28px";
    overlay.style.right = "28px";
    overlay.style.background = "#fff";
    overlay.style.padding = "12px";
    overlay.style.borderRadius = "8px";
    overlay.style.boxShadow = "0px 2px 8px rgba(0,0,0,0.13)";
    overlay.style.width = "320px";
    overlay.innerHTML = `<strong>Resumo das Fichas</strong><pre style="font-size:11px;white-space:pre-wrap">${summaryHTML}</pre>`;
    if (mapEl?.parentElement) {
      mapEl.parentElement.appendChild(overlay);
      html2pdf()
        .set({ margin: 0, filename: "relatorio-fichas.pdf", html2canvas: { scale: 2 } })
        .from(mapEl.parentElement)
        .save()
        .then(() => {
          overlay.remove();
        });
    }
  };

  // Renderização
  return (
    <AppShell sidebar={<Sidebar />}> 
      <div className={`relative h-screen w-full ${fullscreen ? "bg-black" : ""}`}> 
        {/* Barra superior flutuante - Info e Modo */} 
        <div className="panel-flutuante absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-white/95 rounded-lg shadow-lg px-4 py-2 gap-3 border"> 
          <span className="text-sm font-medium"> 
            {displayedFichas.length === filteredFichas.length 
              ? `${formatK(displayedFichas.length)} de ${formatK(filteredFichas.length)} fichas` 
              : `${formatK(displayedFichas.length)} fichas selecionadas`} 
          </span> 
          <button 
            className="p-1.5 rounded hover:bg-gray-100" 
            title="Ver resumo detalhado" 
            onClick={() => setShowSummary((v) => !v)} 
          > 
            <Eye size={18} /> 
          </button> 
          {/* Modo alternador (para demo: fichas/scouter) */} 
          <select 
            className="ml-2 px-2 py-1 text-xs border rounded bg-white" 
            value={modo} 
            onChange={e => setModo(e.target.value as 'fichas' | 'scouter')} 
          > 
            <option value="fichas">Fichas</option> 
            <option value="scouter">Scouter</option> 
          </select> 
        </div> 

        {/* Controles flutuantes estilo ImovelWeb - Lado direito */}
        <div className="floating-controls absolute top-4 right-4 z-40 flex flex-col gap-2">
          {/* Fullscreen e PDF - Sempre visíveis */}
          <button 
            className="bg-white/95 rounded-lg shadow-lg p-3 border hover:bg-gray-50 transition" 
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"} 
            onClick={handleToggleFullscreen} 
          > 
            {fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />} 
          </button> 
          <button 
            className="bg-white/95 rounded-lg shadow-lg p-3 border hover:bg-gray-50 transition" 
            title="Gerar PDF do mapa" 
            onClick={handleGeneratePDF} 
          > 
            <FileText size={20} /> 
          </button>
          
          {/* Botão de controles de seleção (apenas no modo fichas) */}
          {modo === "fichas" && (
            <>
              <button 
                className={`bg-white/95 rounded-lg shadow-lg p-3 border transition ${
                  showHeatmap ? "bg-orange-50 border-orange-300" : "hover:bg-gray-50"
                }`}
                title={showHeatmap ? "Ocultar heatmap" : "Mostrar heatmap"} 
                onClick={handleToggleHeatmap} 
              > 
                <Flame size={20} className={showHeatmap ? "text-orange-500" : "text-gray-400"} /> 
              </button>
              <button 
                className={`bg-white/95 rounded-lg shadow-lg p-3 border transition ${
                  isDrawing ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                }`}
                title={isDrawing ? "Desenhando polígono (duplo clique para finalizar)" : "Desenhar polígono no mapa"} 
                onClick={handleStartSelection}
                disabled={isDrawing || filteredFichas.length === 0}
              > 
                <Pencil size={20} className={isDrawing ? "text-blue-500" : ""} /> 
              </button>
              <button 
                className={`bg-white/95 rounded-lg shadow-lg p-3 border transition ${
                  controlsVisible ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                }`}
                title="Controles de filtro e seleção" 
                onClick={() => setControlsVisible(!controlsVisible)} 
              > 
                <Calendar size={20} /> 
              </button>
            </>
          )}
        </div>

        {/* Painel flutuante de controles de seleção (apenas fichas, quando visível) */} 
        {modo === "fichas" && controlsVisible && ( 
          <div className="panel-flutuante absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"> 
            <div className="bg-white/95 rounded-lg shadow-lg border p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Filtros e Seleção</span>
                <button 
                  className="p-1 rounded hover:bg-gray-100" 
                  onClick={() => setControlsVisible(false)}
                  title="Fechar"
                > 
                  <X size={16} /> 
                </button>
              </div>
              
              <DateRangePicker value={dateRange} onChange={setDateRange} /> 
              
              <div className="flex gap-2 flex-wrap"> 
                {!isDrawing && ( 
                  <button 
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 text-sm" 
                    onClick={handleStartSelection} 
                    title="Desenhar polígono" 
                  > 
                    <Pencil size={16} /> <span>Desenhar polígono</span> 
                  </button> 
                )} 
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 text-sm" 
                  onClick={handleSearchArea} 
                  title="Pesquisar nesta área" 
                > 
                  <RefreshCw size={16} /> <span>Pesquisar área</span> 
                </button> 
                <button 
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 text-sm" 
                  onClick={handleClearSelection} 
                  title="Limpar" 
                > 
                  <X size={16} /> <span>Limpar</span> 
                </button> 
                {isDrawing && ( 
                  <button 
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white border border-blue-600 rounded-lg shadow-sm hover:bg-blue-600 text-sm font-medium" 
                    onClick={handleApplySelection} 
                    title="Aplicar" 
                  > 
                    <Check size={16} /> <span>Aplicar</span> 
                  </button> 
                )} 
              </div>
            </div>
          </div> 
        )} 

        {/* Resumo detalhado */} 
        {showSummary && summary && ( 
          <div className="panel-flutuante absolute top-24 right-4 z-50 w-[340px] max-w-full bg-white/95 rounded-lg shadow-lg border p-4"> 
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Resumo</h3>
              <button 
                className="p-1 rounded hover:bg-gray-100" 
                onClick={() => setShowSummary(false)}
                title="Fechar"
              > 
                <X size={16} /> 
              </button>
            </div>
            <pre className="text-xs whitespace-pre-wrap">{formatSummaryText(summary)}</pre>
          </div> 
        )} 

        {/* Mapa */} 
        <div ref={mapContainerRef} className="h-full w-full z-10" /> 
        {/* Loader/Erro */} 
        {isLoading && ( 
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50"> 
            <span className="animate-spin text-2xl">⏳</span> 
          </div> 
        )} 
        {error && ( 
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-red-600 z-50"> 
            {error} 
          </div> 
        )} 
      </div> 
    </AppShell>
  );
}
