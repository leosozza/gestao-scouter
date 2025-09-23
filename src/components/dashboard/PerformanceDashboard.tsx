import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Filter,
  Calendar as CalendarIcon,
  RefreshCw,
  CheckCircle2,
  Camera,
  MessageSquare,
  Phone,
  Clock,
  UserCheck,
  Users,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Target,
  BarChart3
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getLeads } from '@/repositories/leadsRepo';
import type { Lead } from '@/repositories/types';

interface PerformanceMetrics {
  totalFichas: number;
  comFoto: number;
  confirmadas: number;
  conseguiuContato: number;
  agendadas: number;
  compareceu: number;
  interesse: number;
  concluiuPositivo: number;
  concluiuNegativo: number;
  semInteresseDefinitivo: number;
  semContato: number;
  semInteresseMomento: number;
  iqsMedio: number;
}

export function PerformanceDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(new Date());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalFichas: 0,
    comFoto: 0,
    confirmadas: 0,
    conseguiuContato: 0,
    agendadas: 0,
    compareceu: 0,
    interesse: 0,
    concluiuPositivo: 0,
    concluiuNegativo: 0,
    semInteresseDefinitivo: 0,
    semContato: 0,
    semInteresseMomento: 0,
    iqsMedio: 0
  });

  // Filters state
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [selectedScouters, setSelectedScouters] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange, selectedScouters, selectedProjects]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const filters = {
        dataInicio: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dataFim: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        scouter: selectedScouters.length === 1 ? selectedScouters[0] : undefined,
        projeto: selectedProjects.length === 1 ? selectedProjects[0] : undefined,
      };

      const data = await getLeads(filters);
      setLeads(data);
      calculateMetrics(data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (data: Lead[]) => {
    const total = data.length;
    
    const comFoto = data.filter(lead => lead.cadastro_existe_foto === 'SIM').length;
    const confirmadas = data.filter(lead => lead.ficha_confirmada === 'Sim').length;
    const conseguiuContato = data.filter(lead => lead.presenca_confirmada === 'Sim').length;
    
    // Mock data for other metrics (you would calculate these based on your actual data structure)
    const agendadas = Math.floor(total * 0.0);
    const compareceu = Math.floor(total * 0.0);
    const interesse = Math.floor(total * 0.0);
    const concluiuPositivo = Math.floor(total * 0.0);
    const concluiuNegativo = Math.floor(total * 0.0);
    const semInteresseDefinitivo = Math.floor(total * 0.0);
    const semContato = Math.floor(total * 0.0);
    const semInteresseMomento = Math.floor(total * 0.0);

    setMetrics({
      totalFichas: total,
      comFoto,
      confirmadas,
      conseguiuContato,
      agendadas,
      compareceu,
      interesse,
      concluiuPositivo,
      concluiuNegativo,
      semInteresseDefinitivo,
      semContato,
      semInteresseMomento,
      iqsMedio: 49.7 // Mock value
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSyncing(false);
    setLastSync(new Date());
    await loadData();
  };

  const getScouterOptions = () => {
    return Array.from(new Set(leads.map(lead => lead.scouter).filter(Boolean)))
      .map(scouter => ({ value: scouter, label: scouter }));
  };

  const getProjectOptions = () => {
    return Array.from(new Set(leads.map(lead => lead.projetos).filter(Boolean)))
      .map(project => ({ value: project, label: project }));
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  const MetricCard = ({ 
    title, 
    value, 
    percentage, 
    icon: Icon, 
    iconColor, 
    bgColor 
  }: {
    title: string;
    value: number | string;
    percentage?: string;
    icon: any;
    iconColor: string;
    bgColor: string;
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="space-y-1">
              {typeof value === 'number' && value !== undefined ? (
                <p className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</p>
              ) : (
                <p className="text-2xl font-bold">{percentage || '0.0%'}</p>
              )}
              {percentage && typeof value === 'number' && (
                <p className="text-lg font-semibold text-foreground">{percentage}%</p>
              )}
            </div>
          </div>
          <div className={cn("p-3 rounded-full", bgColor)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Análise de Performance</h1>
            <p className="text-muted-foreground">Dashboard com métricas e indicadores de qualidade dos scouters</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{metrics.totalFichas.toLocaleString('pt-BR')} fichas encontradas</span>
            <span className="text-sm text-muted-foreground">IQS Médio: {metrics.iqsMedio}</span>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>
              
              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {dateRange.from && dateRange.to ? (
                      `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                    ) : (
                      'Selecionar período'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Scouters */}
              <Select value={selectedScouters[0] || ''} onValueChange={(value) => setSelectedScouters(value ? [value] : [])}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Scouters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos Scouters</SelectItem>
                  {getScouterOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Projects */}
              <Select value={selectedProjects[0] || ''} onValueChange={(value) => setSelectedProjects(value ? [value] : [])}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos Projetos</SelectItem>
                  {getProjectOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span>Dados sincronizados</span>
              <span className="text-xs text-muted-foreground">
                há menos de um minuto
              </span>
              <Button variant="outline" size="sm">Online</Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              Sincronizar
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Fichas"
          value={metrics.totalFichas}
          icon={BarChart3}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />
        
        <MetricCard
          title="% com Foto"
          value={metrics.comFoto}
          percentage={getPercentage(metrics.comFoto, metrics.totalFichas)}
          icon={Camera}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />

        <MetricCard
          title="% Confirmadas"
          value={metrics.confirmadas}
          percentage={getPercentage(metrics.confirmadas, metrics.totalFichas)}
          icon={CheckCircle2}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />

        <MetricCard
          title="% Conseguiu Contato"
          value={metrics.conseguiuContato}
          percentage={getPercentage(metrics.conseguiuContato, metrics.totalFichas)}
          icon={Phone}
          iconColor="text-orange-600"
          bgColor="bg-orange-100"
        />

        <MetricCard
          title="% Agendadas"
          value={metrics.agendadas}
          percentage={getPercentage(metrics.agendadas, metrics.totalFichas)}
          icon={Calendar}
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
        />

        <MetricCard
          title="% Compareceu"
          value={metrics.compareceu}
          percentage={getPercentage(metrics.compareceu, metrics.totalFichas)}
          icon={UserCheck}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />

        <MetricCard
          title="% Interesse"
          value={metrics.interesse}
          percentage={getPercentage(metrics.interesse, metrics.totalFichas)}
          icon={TrendingUp}
          iconColor="text-pink-600"
          bgColor="bg-pink-100"
        />

        <MetricCard
          title="% Concluído Positivo"
          value={metrics.concluiuPositivo}
          percentage={getPercentage(metrics.concluiuPositivo, metrics.totalFichas)}
          icon={CheckCircle2}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />

        <MetricCard
          title="% Concluído Negativo"
          value={metrics.concluiuNegativo}
          percentage={getPercentage(metrics.concluiuNegativo, metrics.totalFichas)}
          icon={XCircle}
          iconColor="text-red-600"
          bgColor="bg-red-100"
        />

        <MetricCard
          title="% Sem Interesse Definitivo"
          value={metrics.semInteresseDefinitivo}
          percentage={getPercentage(metrics.semInteresseDefinitivo, metrics.totalFichas)}
          icon={XCircle}
          iconColor="text-red-600"
          bgColor="bg-red-100"
        />

        <MetricCard
          title="% Sem Contato"
          value={metrics.semContato}
          percentage={getPercentage(metrics.semContato, metrics.totalFichas)}
          icon={Phone}
          iconColor="text-gray-600"
          bgColor="bg-gray-100"
        />

        <MetricCard
          title="% Sem Interesse Momento"
          value={metrics.semInteresseMomento}
          percentage={getPercentage(metrics.semInteresseMomento, metrics.totalFichas)}
          icon={Clock}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumo de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-green-600">0.0%</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">IQS Médio</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-blue-600">{metrics.iqsMedio}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Baixo índice de fichas com foto ({getPercentage(metrics.comFoto, metrics.totalFichas)}%)
                </AlertDescription>
              </Alert>
              
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Baixo índice de confirmação WhatsApp ({getPercentage(metrics.confirmadas, metrics.totalFichas)}%)
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}