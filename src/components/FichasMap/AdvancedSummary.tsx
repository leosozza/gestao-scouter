/**
 * Advanced Summary Component with AI Q&A (Point 3 MVP)
 * - Mantém exportações e breakdown de projetos
 * - Adiciona seção de Perguntas & Respostas (fallback local)
 */
import React, { useState, useMemo } from 'react';
import { X, Download, FileText, ChevronDown, ChevronRight, Send, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { hashSelection } from '@/utils/ai/selectionHash';

interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
}

interface AdvancedSummaryProps {
  summary: AnalysisSummary;
  aiAnalysisHTML?: string; // Mantido para compatibilidade (análise local estática)
  onClose: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  isExporting?: boolean;
  centerLatLng?: { lat: number; lng: number };
}

interface QAEntry {
  id: string;
  q: string;
  a: string;
  ts: number;
}

export function AdvancedSummary({
  summary,
  aiAnalysisHTML,
  onClose,
  onExportPDF,
  onExportCSV,
  isExporting = false,
  centerLatLng
}: AdvancedSummaryProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Q&A state
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<QAEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectionHash = useMemo(() => {
    return hashSelection({
      total: summary.total,
      byProjeto: summary.byProjeto.map(p => ({ projeto: p.projeto, total: p.total }))
    });
  }, [summary]);

  const topScouters = useMemo(() => {
    const totals = new Map<string, number>();
    summary.byProjeto.forEach(p => {
      p.byScout.forEach((count, sc) => {
        totals.set(sc, (totals.get(sc) || 0) + count);
      });
    });
    return Array.from(totals.entries())
      .sort((a,b)=> b[1]-a[1])
      .slice(0,5)
      .map(([nome,total]) => ({ nome, total }));
  }, [summary]);

  const handleSend = async () => {
    const q = question.trim();
    if (!q) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          selectionHash,
          context: {
            total: summary.total,
            projetos: summary.byProjeto.slice(0, 25).map(p => ({ nome: p.projeto, total: p.total })),
            topScouters,
            center: centerLatLng
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Falha na análise');
      setHistory(h => [{ id: crypto.randomUUID(), q, a: data.answer, ts: Date.now() }, ...h]);
      setQuestion('');
    } catch (e:any) {
      setErrorMsg(e.message || 'Erro inesperado');
    } finally {
      setSending(false);
    }
  };

  const copyAnswer = (text: string) => {
    navigator.clipboard.writeText(text).catch(()=>{});
  };

  const toggleProject = (projeto: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projeto)) newExpanded.delete(projeto);
    else newExpanded.add(projeto);
    setExpandedProjects(newExpanded);
  };

  return (
    <div className="absolute top-4 right-4 z-[9999] w-[min(90vw,480px)] bg-white/95 rounded-lg shadow-lg border p-4 max-h-[78vh] overflow-y-auto backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Análise da Área</h3>
        <button
          className="p-1 rounded hover:bg-gray-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
          onClick={onClose}
          title="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          onClick={onExportPDF}
          disabled={isExporting}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onExportCSV}
          disabled={isExporting}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </div>

      {/* Total */}
      <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
        <div className="text-lg font-semibold text-orange-900">
          Total: {summary.total} fichas
        </div>
        <div className="text-[10px] text-orange-700 mt-1 font-mono break-all">
          Hash: {selectionHash}
        </div>
      </div>

      {/* Projects breakdown */}
      {summary.byProjeto.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Por Projeto:</h4>
          {summary.byProjeto.map((proj) => {
            const isExpanded = expandedProjects.has(proj.projeto);
            return (
              <div key={proj.projeto} className="mb-2 border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
                  onClick={() => toggleProject(proj.projeto)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="font-medium">{proj.projeto}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{proj.total} fichas</span>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="pl-6 text-sm space-y-1">
                      {Array.from(proj.byScout.entries())
                        .sort((a,b)=> b[1]-a[1])
                        .map(([scouter, count]) => (
                          <div key={scouter} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                            <span className="text-muted-foreground">{scouter}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Q&A Section */}
      <div className="mb-6 border rounded-lg p-3 bg-gray-50/60">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <span>Pergunte sobre esta área</span>
        </h4>
        <Textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ex: Quais projetos dominam a área? Como está a densidade? Recomendações?"
          className="mb-2 text-sm"
          rows={3}
          maxLength={300}
        />
        {errorMsg && (
          <div className="text-xs text-red-600 mb-2">
            {errorMsg}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {question.trim().length}/300
          </span>
          <Button
            size="sm"
            disabled={!question.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {sending ? 'Analisando...' : 'Enviar'}
          </Button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Histórico ({history.length})
          </h4>
          {history.map(item => (
            <div key={item.id} className="border rounded-md p-2 bg-white shadow-sm">
              <div className="text-xs font-medium text-blue-600 mb-1">
                Q: {item.q}
              </div>
              <pre className="whitespace-pre-wrap text-xs text-gray-800 font-sans mb-2">
                {item.a}
              </pre>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">
                  {new Date(item.ts).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => copyAnswer(item.a)}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis HTML (legacy static block) */}
      {aiAnalysisHTML && (
        <div className="mt-4 pt-4 border-t">
          <div dangerouslySetInnerHTML={{ __html: aiAnalysisHTML }} />
        </div>
      )}
    </div>
  );
}