import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle, XCircle, DollarSign, Edit2, Check, X } from "lucide-react";
import { format, eachDayOfInterval, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAjudaCustoConfig } from "@/utils/ajudaCustoSettings";

interface DailyBreakdownPanelProps {
  startDate: string;
  endDate: string;
  fichas: any[];
  selectedScouter?: string;
  selectedProject?: string;
}

type DistanciaSeletiva = 'proxima' | 'longe';

interface DayInfo {
  date: Date;
  fichasCount: number;
  fichas: any[];
  isWorkDay: boolean;
  dayType: 'work' | 'folga' | 'falta';
  valor: number;
  ajudaCusto: number;
  // não persistimos a distância aqui, usamos overrides por data
}

export const DailyBreakdownPanel: React.FC<DailyBreakdownPanelProps> = ({
  startDate,
  endDate,
  fichas,
  selectedScouter,
  selectedProject
}) => {
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dayTypeOverrides, setDayTypeOverrides] = useState<{ [key: string]: 'folga' | 'falta' }>({});
  // NOVO: distância por dia (Próxima | Longe)
  const [dayDistanceOverrides, setDayDistanceOverrides] = useState<{ [key: string]: DistanciaSeletiva }>({});

  const dailyBreakdown = useMemo(() => {
    if (!startDate || !endDate) return [];

    const ajuda = getAjudaCustoConfig();

    console.log('=== DAILY BREAKDOWN DEBUG ===');
    console.log('Período:', startDate, 'até', endDate);
    console.log('Fichas totais:', fichas.length);
    console.log('Scouter selecionado:', selectedScouter);
    console.log('Projeto selecionado:', selectedProject);

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (!isValid(start) || !isValid(end)) {
      console.warn('Datas inválidas:', { startDate, endDate });
      return [];
    }

    // Filtrar fichas por scouter e projeto se selecionados
    let filteredFichas = fichas;
    
    if (selectedScouter && selectedScouter !== 'all') {
      filteredFichas = filteredFichas.filter(ficha => 
        ficha.Gestao_de_Scouter === selectedScouter
      );
    }
    
    if (selectedProject && selectedProject !== 'all') {
      filteredFichas = filteredFichas.filter(ficha => 
        ficha.Projetos_Comerciais === selectedProject
      );
    }

    console.log('Fichas filtradas:', filteredFichas.length);

    // Função para parsear data da ficha
    const parseFichaDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      try {
        // Formato DD/MM/YYYY HH:mm ou DD/MM/YYYY
        if (dateStr.includes('/')) {
          const [datePart] = dateStr.split(' ');
          const [day, month, year] = datePart.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // Formato ISO
        return parseISO(dateStr);
      } catch (error) {
        console.warn('Erro ao parsear data:', dateStr, error);
        return null;
      }
    };

    // Gerar todos os dias do intervalo
    const allDays = eachDayOfInterval({ start, end });
    console.log('Dias no período:', allDays.length);

    const breakdown: DayInfo[] = allDays.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      
      // Encontrar fichas deste dia
      const dayFichas = filteredFichas.filter(ficha => {
        const fichaDate = parseFichaDate(ficha.Data_de_Criacao_da_Ficha || ficha.Criado);
        if (!fichaDate) return false;
        
        const fichaDateKey = format(fichaDate, 'yyyy-MM-dd');
        return fichaDateKey === dateKey;
      });

      const fichasCount = dayFichas.length;
      const valor = dayFichas.reduce((sum, ficha) => sum + (ficha.valor_por_ficha_num || 0), 0);
      
      let ajudaCusto = 0;
      let dayType: 'work' | 'folga' | 'falta' = 'work';

      if (fichasCount === 0) {
        // Verificar se tem override manual
        if (dayTypeOverrides[dateKey]) {
          dayType = dayTypeOverrides[dateKey];
        } else {
          // Se não tem fichas, verificar se é fim de semana (folga) ou dia útil (falta)
          const dayOfWeek = date.getDay();
          dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'folga' : 'falta';
        }

        // Folga remunerada apenas quando marcado como Longe
        const distancia = dayDistanceOverrides[dateKey];
        if (dayType === 'folga' && distancia === 'longe') {
          ajudaCusto = ajuda.folgaLonge;
        } else {
          ajudaCusto = 0;
        }
      } else {
        // Dia trabalhado: Próxima ou Longe define ajuda
        const distancia: DistanciaSeletiva = dayDistanceOverrides[dateKey] ?? 'proxima';
        ajudaCusto = distancia === 'longe' ? ajuda.longe : ajuda.proxima;
      }

      return {
        date,
        fichasCount,
        fichas: dayFichas,
        isWorkDay: fichasCount > 0,
        dayType,
        valor,
        ajudaCusto
      };
    });

    console.log('Breakdown gerado:', breakdown.length, 'dias');
    return breakdown;
  }, [startDate, endDate, fichas, selectedScouter, selectedProject, dayTypeOverrides, dayDistanceOverrides]);

  const summary = useMemo(() => {
    const totalFichas = dailyBreakdown.reduce((sum, day) => sum + day.fichasCount, 0);
    const totalValor = dailyBreakdown.reduce((sum, day) => sum + day.valor, 0);
    const totalAjudaCusto = dailyBreakdown.reduce((sum, day) => sum + day.ajudaCusto, 0);
    const diasTrabalhados = dailyBreakdown.filter(day => day.isWorkDay).length;
    const folgas = dailyBreakdown.filter(day => day.dayType === 'folga').length;
    const faltas = dailyBreakdown.filter(day => day.dayType === 'falta').length;

    return { totalFichas, totalValor, totalAjudaCusto, diasTrabalhados, folgas, faltas };
  }, [dailyBreakdown]);

  const handleEditDayType = (dateKey: string, newType: 'folga' | 'falta') => {
    setDayTypeOverrides(prev => ({
      ...prev,
      [dateKey]: newType
    }));
    setEditingDay(null);
  };

  const cancelEdit = () => {
    setEditingDay(null);
  };

  const setDistancia = (dateKey: string, distancia: DistanciaSeletiva) => {
    setDayDistanceOverrides(prev => ({ ...prev, [dateKey]: distancia }));
  };

  if (!startDate || !endDate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Breakdown Diário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Selecione um período para ver o breakdown diário</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumo do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalFichas}</div>
              <div className="text-sm text-muted-foreground">Total Fichas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                R$ {summary.totalValor.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Valor Fichas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                R$ {summary.totalAjudaCusto.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Ajuda de Custo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{summary.diasTrabalhados}</div>
              <div className="text-sm text-muted-foreground">Dias Trabalhados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.folgas}</div>
              <div className="text-sm text-muted-foreground">Folgas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.faltas}</div>
              <div className="text-sm text-muted-foreground">Faltas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Diário */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {dailyBreakdown.map((day, index) => {
              const dateKey = format(day.date, 'yyyy-MM-dd');
              const isEditing = editingDay === dateKey;
              const distancia = dayDistanceOverrides[dateKey] ?? (day.isWorkDay ? 'proxima' : undefined);

              return (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium min-w-[100px]">
                      {format(day.date, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({format(day.date, 'EEEE', { locale: ptBR })})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Seletor Próxima/Longe sempre disponível para marcar a distância */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={distancia === 'proxima' ? "default" : "outline"}
                        className="h-6 px-2 text-xs"
                        onClick={() => setDistancia(dateKey, 'proxima')}
                      >
                        Próx
                      </Button>
                      <Button
                        size="sm"
                        variant={distancia === 'longe' ? "default" : "outline"}
                        className="h-6 px-2 text-xs"
                        onClick={() => setDistancia(dateKey, 'longe')}
                      >
                        Longe
                      </Button>
                    </div>

                    {day.isWorkDay ? (
                      <>
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {day.fichasCount} fichas
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          R$ {day.valor.toFixed(2)}
                        </Badge>
                        {/* Ajuda de custo baseada na distância */}
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                          Ajuda: R$ {day.ajudaCusto.toFixed(2)}
                        </Badge>
                      </>
                    ) : (
                      <>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs bg-orange-100 text-orange-800 border-orange-200"
                              onClick={() => handleEditDayType(dateKey, 'folga')}
                            >
                              Folga
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs bg-red-100 text-red-800 border-red-200"
                              onClick={() => handleEditDayType(dateKey, 'falta')}
                            >
                              Falta
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={cancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant="outline" 
                              className={
                                day.dayType === 'folga' 
                                  ? "bg-orange-100 text-orange-800 border-orange-200" 
                                  : "bg-red-100 text-red-800 border-red-200"
                              }
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              {day.dayType === 'folga' ? 'Folga' : 'Falta'}
                            </Badge>
                            {/* Se folga e marcado Longe, mostra remuneração */}
                            {day.dayType === 'folga' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                R$ {day.ajudaCusto.toFixed(2)}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingDay(dateKey)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
