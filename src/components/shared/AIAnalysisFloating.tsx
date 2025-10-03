import { useState } from 'react';
import { Brain, Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AIAnalysisFloatingProps {
  data?: any;
  onAnalyze?: (data: any) => Promise<string>;
}

/**
 * Componente de Análise de IA Flutuante
 * 
 * Comportamento:
 * 1. Botão toggle no topo para ativar/desativar
 * 2. Quando ativo, mostra FAB no canto inferior direito
 * 3. FAB abre painel de análise
 */
export function AIAnalysisFloating({ data, onAnalyze }: AIAnalysisFloatingProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');

  // Análise de dados
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      if (onAnalyze) {
        const result = await onAnalyze(data);
        setAnalysis(result);
      } else {
        // Análise simulada para demonstração
        await new Promise(resolve => setTimeout(resolve, 2000));
        setAnalysis(`
📊 **Análise da Página Atual**

**Dados Detectados:**
- ${data?.totalFichas || 0} fichas no mapa
- ${data?.fichasComFoto || 0} fichas com foto
- ${data?.projetos?.length || 0} projetos ativos

**Insights:**
- Taxa de conversão com foto: ${data?.fichasComFoto && data?.totalFichas ? ((data.fichasComFoto / data.totalFichas) * 100).toFixed(1) : 0}%
- Performance está ${data?.totalFichas > 100 ? 'acima' : 'abaixo'} da meta
- Recomendação: ${data?.fichasComFoto < data?.totalFichas * 0.7 ? 'Aumentar registro de fotos' : 'Manter estratégia atual'}

**Próximos Passos:**
1. Revisar áreas com baixa cobertura
2. Otimizar rotas dos scouters
3. Acompanhar métricas diárias
        `.trim());
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      setAnalysis('❌ Erro ao realizar análise. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Botão superior (toggle)
  const TopToggleButton = () => (
    <button
      onClick={() => setIsActive(!isActive)}
      className={`flex items-center justify-center w-[30px] h-[30px] rounded transition-all duration-200 ${
        isActive 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
          : 'hover:bg-accent text-muted-foreground'
      }`}
      title={isActive ? 'Desativar Análise IA' : 'Ativar Análise IA'}
    >
      <Brain size={16} className={isActive ? 'animate-pulse' : ''} />
    </button>
  );

  // FAB (Floating Action Button) - canto inferior direito
  const FloatingButton = () => {
    if (!isActive) return null;

    return (
      <button
        onClick={() => {
          setIsPanelOpen(true);
          if (!analysis) handleAnalyze();
        }}
        className="fixed bottom-6 right-6 z-[9999] w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer"
        style={{ boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)' }}
        title="Abrir Análise de IA"
      >
        <Sparkles size={28} className="drop-shadow-lg" />
      </button>
    );
  };

  // Painel de análise
  const AnalysisPanel = () => {
    if (!isPanelOpen) return null;

    return (
      <div className="fixed inset-0 z-[101] flex items-end justify-end p-6 pointer-events-none">
        <Card className="w-full max-w-md max-h-[80vh] pointer-events-auto animate-in slide-in-from-bottom-8 fade-in shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Análise de IA</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPanelOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analisando dados da página...
                </p>
              </div>
            ) : analysis ? (
              <>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {analysis.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h3 key={i} className="text-base font-semibold mt-4 mb-2">
                            {line.replace(/\*\*/g, '')}
                          </h3>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={i} className="ml-4 text-sm text-muted-foreground">
                            {line.substring(2)}
                          </li>
                        );
                      }
                      if (line.match(/^\d+\./)) {
                        return (
                          <li key={i} className="ml-4 text-sm text-muted-foreground">
                            {line.substring(line.indexOf('.') + 1).trim()}
                          </li>
                        );
                      }
                      if (line.trim().startsWith('📊') || line.trim().startsWith('❌')) {
                        return (
                          <p key={i} className="text-base font-medium mb-4">
                            {line}
                          </p>
                        );
                      }
                      return line.trim() ? (
                        <p key={i} className="text-sm text-muted-foreground mb-2">
                          {line}
                        </p>
                      ) : null;
                    })}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    variant="outline"
                    className="flex-1"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Atualizar Análise
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Clique no botão para iniciar a análise
                </p>
                <Button onClick={handleAnalyze}>
                  <Brain className="h-4 w-4 mr-2" />
                  Iniciar Análise
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <TopToggleButton />
      <FloatingButton />
      <AnalysisPanel />
    </>
  );
}
