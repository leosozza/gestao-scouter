import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  loadFichasData,
  createFichasHeatmap,
  createFichasSelection,
  generateSummary,
  formatSummaryText,
  type FichaDataPoint,
  type FichasSummaryData,
  type SelectionResult,
  type FichasHeatmap,
  type FichasSelection,
} from "@/map/fichas";
import { AppShell } from "@/layouts/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Calendar, Eye, Pencil, RefreshCw, X, Check, FileText, Maximize2, Minimize2 } from "lucide-react";
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
  const heatmapRef = useRef<FichasHeatmap | null>(null);
  const selectionRef = useRef<FichasSelection | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allFichas, setAllFichas] = useState<FichaDataPoint[]>([]);
  const [filteredFichas, setFilteredFichas] = useState<FichaDataPoint[]>([]);
  const [displayedFichas, setDisplayedFichas] = useState<FichaDataPoint[]>([]);
  const [summary, setSummary] = useState<FichasSummaryData | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Controle de seleção
  const [controlsVisible, setControlsVisible] = useState(false);
  const [selecting, setSelecting] = useState(false);
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

  // Carregar dados e aplicar filtro de datas
  useEffect(() => {
    let canceled = false;
    if (!mapRef.current) return;
    setIsLoading(true);
    setError(null);

    loadFichasData()
      .then(({ fichas }) => {
        if (canceled) return;
        setAllFichas(fichas);
        // filtro inicial por data
        const filtered = fichas.filter((f) => {
          // Corrigir para pegar data da coluna D
          const dataVal = f.data || f.Data || f["Data"];
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
        // heatmap
        if (mapRef.current) {
          if (heatmapRef.current) {
            heatmapRef.current.updateData(filtered);
            heatmapRef.current.fitBounds();
          } else {
            heatmapRef.current = createFichasHeatmap(mapRef.current, {
              radius: 14,
              blur: 22,
              max: 0.6,
              minOpacity: 0.23,
              gradient: {
                0.2: "#A7F3D0",
                0.4: "#FDE68A",
                0.7: "#FCA5A5",
                1.0: "#EF4444",
              },
            });
            heatmapRef.current.updateData(filtered);
            heatmapRef.current.fitBounds();
          }
        }
      })
      .catch((e) => setError("Erro ao carregar fichas: " + (e?.message || "")))
      .finally(() => setIsLoading(false));

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line
  }, [dateRange]);

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
      heatmapRef.current.updateData(visible);
    };
    mapRef.current.on("moveend zoomend", onMove);
    return () => {
      mapRef.current?.off("moveend zoomend", onMove);
    };
    // eslint-disable-next-line
  }, [filteredFichas]);

  // Seleção poligonal (desenhar zona)
  const handleStartSelection = () => {
    if (!mapRef.current || !filteredFichas.length) return;
    setSelecting(true);
    if (selectionRef.current) selectionRef.current.destroy();
    selectionRef.current = createFichasSelection(
      mapRef.current,
      filteredFichas,
      (result: SelectionResult) => {
        setSelecting(false);
        setDisplayedFichas(result.fichas);
        setSummary(generateSummary(result.fichas));
        heatmapRef.current?.updateData(result.fichas);
      },
      { mode: "polygon", disableMapPan: true }
    );
    selectionRef.current.startPolygonSelection();
  };

  // Limpar seleção
  const handleClearSelection = () => {
    setDisplayedFichas(filteredFichas);
    setSummary(generateSummary(filteredFichas));
    heatmapRef.current?.updateData(filteredFichas);
    selectionRef.current?.destroy();
    setSelecting(false);
  };

  // Pesquisar nesta área (reset para área visível)
  const handleSearchArea = () => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    const visibles = filteredFichas.filter((f) =>
      bounds.contains([f.lat, f.lng])
    );
    setDisplayedFichas(visibles);
    setSummary(generateSummary(visibles));
    heatmapRef.current?.updateData(visibles);
    selectionRef.current?.destroy();
    setSelecting(false);
  };

  // Aplicar seleção (redundante, já aplica ao finalizar polígono)
  const handleApplySelection = () => {
    setSelecting(false);
    selectionRef.current?.destroy();
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
        {/* Barra superior flutuante */} 
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-white/95 rounded shadow-md px-4 py-2 gap-2 border"> 
          <span className="text-sm font-medium"> 
            {displayedFichas.length === filteredFichas.length 
              ? `${formatK(displayedFichas.length)} de ${formatK(filteredFichas.length)} fichas` 
              : `${formatK(displayedFichas.length)} fichas selecionadas`} 
          </span> 
          <button 
            className="ml-2 p-1 rounded hover:bg-gray-100" 
            title="Ver resumo detalhado" 
            onClick={() => setShowSummary((v) => !v)} 
          > 
            <Eye size={18} /> 
          </button> 
          <button 
            className="ml-2 p-1 rounded hover:bg-gray-100" 
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"} 
            onClick={handleToggleFullscreen} 
          > 
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />} 
          </button> 
          <button 
            className="ml-2 p-1 rounded hover:bg-gray-100" 
            title="Gerar PDF do mapa" 
            onClick={handleGeneratePDF} 
          > 
            <FileText size={18} /> 
          </button> 
          {/* Modo alternador (para demo: fichas/scouter) */} 
          <select 
            className="ml-3 px-2 py-1 text-xs border rounded bg-white" 
            value={modo} 
            onChange={e => setModo(e.target.value as 'fichas' | 'scouter')} 
          > 
            <option value="fichas">Fichas</option> 
            <option value="scouter">Scouter</option> 
          </select> 
        </div> 

        {/* Botão flutuante de lápis (apenas no modo fichas) */} 
        {modo === "fichas" && !controlsVisible && ( 
          <button 
            className="absolute bottom-8 right-8 z-50 bg-white rounded-full shadow-lg p-3 border hover:bg-gray-50 transition" 
            title="Controles de seleção" 
            onClick={() => setControlsVisible(true)} 
            style={{ opacity: 0.92 }} 
          > 
            <Pencil size={28} /> 
          </button> 
        )} 

        {/* Painel flutuante de controles (apenas fichas) */} 
        {modo === "fichas" && controlsVisible && ( 
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"> 
            <div className="mb-2"> 
              <DateRangePicker value={dateRange} onChange={setDateRange} /> 
            </div> 
            <div className="flex gap-2"> 
              {!selecting && ( 
                <button 
                  className="flex items-center gap-1 px-3 py-2 bg-white border rounded shadow hover:bg-gray-50" 
                  onClick={handleStartSelection} 
                  title="Desenhar zona" 
                > 
                  <Pencil size={18} /> <span className="text-sm">Desenhar zona</span> 
                </button> 
              )} 
              <button 
                className="flex items-center gap-1 px-3 py-2 bg-white border rounded shadow hover:bg-gray-50" 
                onClick={handleSearchArea} 
                title="Pesquisar nesta área" 
              > 
                <RefreshCw size={18} /> <span className="text-sm">Pesquisar nesta área</span> 
              </button> 
              <button 
                className="flex items-center gap-1 px-3 py-2 bg-white border rounded shadow hover:bg-gray-50" 
                onClick={handleClearSelection} 
                title="Limpar" 
              > 
                <X size={18} /> <span className="text-sm">Limpar</span> 
              </button> 
              {selecting && ( 
                <button 
                  className="flex items-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded shadow" 
                  onClick={handleApplySelection} 
                  title="Aplicar" 
                > 
                  <Check size={18} /> <span className="text-sm">Aplicar</span> 
                </button> 
              )} 
            </div> 
            <button 
              className="mt-2 text-xs text-gray-500 underline" 
              onClick={() => setControlsVisible(false)} 
            > 
              Fechar controles 
            </button> 
          </div> 
        )} 

        {/* Resumo detalhado */} 
        {showSummary && summary && ( 
          <div className="absolute top-24 right-4 z-50 w-[340px] max-w-full bg-white rounded-lg shadow-lg border p-4"> 
            <h3 className="font-bold mb-2">Resumo</h3> 
            <pre className="text-xs whitespace-pre-wrap">{formatSummaryText(summary)}</pre> 
            <button 
              className="mt-2 px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" 
              onClick={() => setShowSummary(false)} 
            > 
              Fechar 
            </button> 
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