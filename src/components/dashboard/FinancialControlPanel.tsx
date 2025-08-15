
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, DollarSign, Users, Target, Edit2, Save, X } from "lucide-react";
import { format, parseISO, eachDayOfInterval, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Ficha {
  ID: number;
  Projetos_Comerciais: string;
  Gestao_de_Scouter: string;
  Criado: string;
  Data_de_Criacao_da_Ficha: string;
  MaxScouterApp_Verificacao: string;
  Valor_por_Fichas: string;
  valor_por_ficha_num?: number;
}

interface Projeto {
  agencia_e_seletiva: string;
  meta_de_fichas: number;
  inicio_captacao_fichas: string;
  termino_captacao_fichas: string;
  meta_individual?: number;
  dias_total?: number;
  taxa_diaria_meta?: number;
}

interface HelpCostConfig {
  [projeto: string]: {
    valor_normal: number;
    valor_folga: number;
    is_distant: boolean;
  };
}

interface DayClassification {
  date: string;
  type: 'trabalho' | 'folga' | 'falta';
  fichas: number;
  valor_ajuda_custo: number;
}

interface FinancialControlPanelProps {
  fichas: Ficha[];
  projetos: Projeto[];
  selectedPeriod: { start: string; end: string } | null;
}

export const FinancialControlPanel = ({ fichas = [], projetos = [], selectedPeriod }: FinancialControlPanelProps) => {
  const [selectedScouter, setSelectedScouter] = useState<string>("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [helpCostConfig, setHelpCostConfig] = useState<HelpCostConfig>({});
  const [dayClassifications, setDayClassifications] = useState<{ [key: string]: DayClassification }>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);

  // Função para filtrar scouters baseado na seletiva escolhida e período
  const availableScouters = useMemo(() => {
    let filteredFichas = fichas;

    // Filtrar por projeto se selecionado
    if (selectedProject) {
      filteredFichas = filteredFichas.filter(f => f.Projetos_Comerciais === selectedProject);
    }

    // Filtrar por período se selecionado
    if (selectedPeriod) {
      const startDate = new Date(selectedPeriod.start);
      const endDate = new Date(selectedPeriod.end);
      
      filteredFichas = filteredFichas.filter(f => {
        const fichaDate = new Date(f.Criado);
        return fichaDate >= startDate && fichaDate <= endDate;
      });
    }

    // Extrair scouters únicos e filtrar valores vazios/inválidos
    const scoutersSet = new Set(
      filteredFichas
        .map(f => f.Gestao_de_Scouter)
        .filter(scouter => scouter && scouter.trim() !== '')
    );
    return Array.from(scoutersSet).sort();
  }, [fichas, selectedProject, selectedPeriod]);

  // Função para filtrar projetos baseado no período
  const availableProjects = useMemo(() => {
    let filteredFichas = fichas;

    // Filtrar por período se selecionado
    if (selectedPeriod) {
      const startDate = new Date(selectedPeriod.start);
      const endDate = new Date(selectedPeriod.end);
      
      filteredFichas = filteredFichas.filter(f => {
        const fichaDate = new Date(f.Criado);
        return fichaDate >= startDate && fichaDate <= endDate;
      });
    }

    // Extrair projetos únicos e filtrar valores vazios/inválidos
    const projectsSet = new Set(
      filteredFichas
        .map(f => f.Projetos_Comerciais)
        .filter(projeto => projeto && projeto.trim() !== '')
    );
    return Array.from(projectsSet).sort();
  }, [fichas, selectedPeriod]);

  // Buscar dados do scouter selecionado
  const scouterData = useMemo(() => {
    if (!selectedScouter) return null;

    let scouterFichas = fichas.filter(f => f.Gestao_de_Scouter === selectedScouter);

    // Aplicar filtros
    if (selectedProject) {
      scouterFichas = scouterFichas.filter(f => f.Projetos_Comerciais === selectedProject);
    }

    if (selectedPeriod) {
      const startDate = new Date(selectedPeriod.start);
      const endDate = new Date(selectedPeriod.end);
      
      scouterFichas = scouterFichas.filter(f => {
        const fichaDate = new Date(f.Criado);
        return fichaDate >= startDate && fichaDate <= endDate;
      });
    }

    return {
      totalFichas: scouterFichas.length,
      projetos: [...new Set(scouterFichas.map(f => f.Projetos_Comerciais))],
      fichasPorDia: scouterFichas.reduce((acc, ficha) => {
        const date = ficha.Criado;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    };
  }, [fichas, selectedScouter, selectedProject, selectedPeriod]);

  // Gerar breakdown diário
  const dailyBreakdown = useMemo(() => {
    if (!selectedPeriod || !selectedScouter) return [];

    const startDate = new Date(selectedPeriod.start);
    const endDate = new Date(selectedPeriod.end);
    
    if (!isValid(startDate) || !isValid(endDate)) return [];

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    return allDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const fichasCount = scouterData?.fichasPorDia[dateStr] || 0;
      
      const classification = dayClassifications[dateStr] || {
        date: dateStr,
        type: fichasCount > 0 ? 'trabalho' : 'falta',
        fichas: fichasCount,
        valor_ajuda_custo: getHelpCostValue(dateStr, fichasCount > 0 ? 'trabalho' : 'falta')
      };

      return {
        date: dateStr,
        displayDate: format(date, 'dd/MM', { locale: ptBR }),
        weekDay: format(date, 'EEE', { locale: ptBR }),
        ...classification
      };
    });
  }, [selectedPeriod, selectedScouter, scouterData, dayClassifications, helpCostConfig, selectedProject]);

  const getHelpCostValue = (date: string, type: 'trabalho' | 'folga' | 'falta'): number => {
    if (type === 'falta') return 0;
    
    const projectConfig = helpCostConfig[selectedProject];
    if (!projectConfig) return type === 'trabalho' ? 30 : 50; // valores padrão
    
    return type === 'trabalho' ? projectConfig.valor_normal : projectConfig.valor_folga;
  };

  const updateDayClassification = (date: string, newType: 'trabalho' | 'folga' | 'falta') => {
    const fichasCount = scouterData?.fichasPorDia[date] || 0;
    
    setDayClassifications(prev => ({
      ...prev,
      [date]: {
        date,
        type: newType,
        fichas: fichasCount,
        valor_ajuda_custo: getHelpCostValue(date, newType)
      }
    }));
    setEditingDay(null);
  };

  const updateHelpCostConfig = (projeto: string, config: { valor_normal: number; valor_folga: number; is_distant: boolean }) => {
    setHelpCostConfig(prev => ({
      ...prev,
      [projeto]: config
    }));
  };

  // Calcular totais
  const totals = useMemo(() => {
    const totalFichas = dailyBreakdown.reduce((sum, day) => sum + day.fichas, 0);
    const totalAjudaCusto = dailyBreakdown.reduce((sum, day) => sum + day.valor_ajuda_custo, 0);
    const diasTrabalhados = dailyBreakdown.filter(day => day.type === 'trabalho').length;
    const diasFolga = dailyBreakdown.filter(day => day.type === 'folga').length;
    const diasFalta = dailyBreakdown.filter(day => day.type === 'falta').length;

    return {
      totalFichas,
      totalAjudaCusto,
      diasTrabalhados,
      diasFolga,
      diasFalta
    };
  }, [dailyBreakdown]);

  // Reset scouter quando mudar projeto
  useEffect(() => {
    if (selectedProject && selectedScouter && !availableScouters.includes(selectedScouter)) {
      setSelectedScouter("");
    }
  }, [selectedProject, selectedScouter, availableScouters]);

  const getBadgeVariant = (type: 'trabalho' | 'folga' | 'falta') => {
    switch (type) {
      case 'trabalho': return 'default';
      case 'folga': return 'secondary';
      case 'falta': return 'destructive';
      default: return 'outline';
    }
  };

  const getBadgeColor = (type: 'trabalho' | 'folga' | 'falta') => {
    switch (type) {
      case 'trabalho': return 'bg-blue-500 text-white';
      case 'folga': return 'bg-green-500 text-white';
      case 'falta': return 'bg-red-500 text-white';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Controle Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seletiva/Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {availableProjects.map(projeto => (
                    <SelectItem key={projeto} value={projeto}>
                      {projeto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scouter</Label>
              <Select 
                value={selectedScouter} 
                onValueChange={setSelectedScouter}
                disabled={!selectedProject && !selectedPeriod}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedProject && !selectedPeriod 
                      ? "Selecione projeto ou período primeiro..." 
                      : "Selecione o scouter..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableScouters.map(scouter => (
                    <SelectItem key={scouter} value={scouter}>
                      {scouter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Ajuda de Custo */}
      {selectedProject && selectedProject !== "all" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Configuração de Ajuda de Custo - {selectedProject}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor Normal (Trabalho)</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={helpCostConfig[selectedProject]?.valor_normal || ''}
                  onChange={(e) => updateHelpCostConfig(selectedProject, {
                    ...helpCostConfig[selectedProject],
                    valor_normal: Number(e.target.value),
                    valor_folga: helpCostConfig[selectedProject]?.valor_folga || 50,
                    is_distant: helpCostConfig[selectedProject]?.is_distant || false
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Folga Remunerada</Label>
                <Input
                  type="number"
                  placeholder="50"
                  value={helpCostConfig[selectedProject]?.valor_folga || ''}
                  onChange={(e) => updateHelpCostConfig(selectedProject, {
                    ...helpCostConfig[selectedProject],
                    valor_normal: helpCostConfig[selectedProject]?.valor_normal || 30,
                    valor_folga: Number(e.target.value),
                    is_distant: helpCostConfig[selectedProject]?.is_distant || false
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Seletiva</Label>
                <Select
                  value={helpCostConfig[selectedProject]?.is_distant ? 'distant' : 'nearby'}
                  onValueChange={(value) => updateHelpCostConfig(selectedProject, {
                    ...helpCostConfig[selectedProject],
                    valor_normal: value === 'distant' ? 70 : 30,
                    valor_folga: value === 'distant' ? 50 : 30,
                    is_distant: value === 'distant'
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nearby">Próxima (R$ 30)</SelectItem>
                    <SelectItem value="distant">Distante (R$ 70)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown Diário */}
      {selectedScouter && selectedPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Breakdown Diário - {selectedScouter}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totals.totalFichas}</div>
                <div className="text-sm text-muted-foreground">Total Fichas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">R$ {totals.totalAjudaCusto}</div>
                <div className="text-sm text-muted-foreground">Ajuda de Custo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totals.diasTrabalhados}</div>
                <div className="text-sm text-muted-foreground">Dias Trabalhados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totals.diasFolga}</div>
                <div className="text-sm text-muted-foreground">Dias Folga</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totals.diasFalta}</div>
                <div className="text-sm text-muted-foreground">Faltas</div>
              </div>
            </div>

            {/* Lista de Dias */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dailyBreakdown.map((day) => (
                <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium min-w-[60px]">
                      {day.displayDate}
                    </div>
                    <div className="text-xs text-muted-foreground min-w-[40px]">
                      {day.weekDay}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingDay === day.date ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDayClassification(day.date, 'trabalho')}
                            className="text-xs"
                          >
                            Trabalho
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDayClassification(day.date, 'folga')}
                            className="text-xs"
                          >
                            Folga
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateDayClassification(day.date, 'falta')}
                            className="text-xs"
                          >
                            Falta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingDay(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge className={getBadgeColor(day.type)}>
                            {day.type === 'trabalho' ? 'Trabalho' : 
                             day.type === 'folga' ? 'Folga' : 'Falta'}
                          </Badge>
                          {(day.type === 'folga' || day.type === 'falta') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingDay(day.date)}
                              className="p-1 h-6 w-6"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="min-w-[60px] text-right">
                      {day.fichas > 0 && `${day.fichas} fichas`}
                    </div>
                    <div className="min-w-[80px] text-right font-medium">
                      {day.valor_ajuda_custo > 0 && (
                        <Badge className="bg-blue-500 text-white">
                          R$ {day.valor_ajuda_custo}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botões de Pagamento */}
            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button className="flex-1">
                Pagar Apenas Ajuda de Custo (R$ {totals.totalAjudaCusto})
              </Button>
              <Button variant="outline" className="flex-1">
                Pagar Completo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há scouter selecionado */}
      {!selectedScouter && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Selecione um projeto ou período e um scouter para ver o controle financeiro
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
