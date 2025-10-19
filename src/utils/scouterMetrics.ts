import { format, parse, differenceInMinutes, differenceInHours } from 'date-fns';
import type { Ficha } from '@/repositories/types';

/**
 * Extrai a data e hora de uma ficha, priorizando hora_criacao_ficha + criado,
 * e usando datahoracel como fallback
 */
function getFichaDateTime(ficha: Lead): Date | null {
  try {
    // Prioridade 1: hora_criacao_ficha + criado
    if (ficha.hora_criacao_ficha && ficha.criado) {
      // criado está em formato dd/MM/yyyy
      // hora_criacao_ficha está em formato HH:mm
      const dateTimeParts = `${ficha.criado} ${ficha.hora_criacao_ficha}`;
      const parsedDate = parse(dateTimeParts, 'dd/MM/yyyy HH:mm', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Fallback: datahoracel
    if (ficha.datahoracel) {
      // datahoracel está em formato dd/MM/yyyy HH:mm
      const parsedDate = parse(ficha.datahoracel, 'dd/MM/yyyy HH:mm', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Fallback adicional: tentar acessar campo direto (pode vir de diferentes fontes)
    const dataHoraField = ficha['Data de criação da Ficha'] || ficha['data_criacao_ficha'];
    if (dataHoraField && typeof dataHoraField === 'string') {
      const parsedDate = parse(dataHoraField, 'dd/MM/yyyy HH:mm', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair data/hora da ficha:', error);
    return null;
  }
}

/**
 * Agrupa fichas por scouter e data
 */
function groupFichasByScouterAndDate(fichas: Lead[]): Record<string, Record<string, Lead[]>> {
  const grouped: Record<string, Record<string, Lead[]>> = {};

  fichas.forEach(ficha => {
    const scouter = ficha.scouter || 'Sem Scouter';
    const dateTime = getFichaDateTime(ficha);
    
    if (!dateTime) return;

    const dateKey = format(dateTime, 'yyyy-MM-dd');

    if (!grouped[scouter]) {
      grouped[scouter] = {};
    }
    if (!grouped[scouter][dateKey]) {
      grouped[scouter][dateKey] = [];
    }

    grouped[scouter][dateKey].push(ficha);
  });

  return grouped;
}

/**
 * Calcula as horas trabalhadas por dia por scouter
 * (diferença entre primeira e última ficha do dia)
 */
export function calculateWorkingHours(fichas: Lead[]): {
  totalHours: number;
  averageHoursPerDay: number;
  dayCount: number;
} {
  const grouped = groupFichasByScouterAndDate(fichas);
  let totalHours = 0;
  let dayCount = 0;

  Object.values(grouped).forEach(scouterDays => {
    Object.values(scouterDays).forEach(dayLeads => {
      if (dayLeads.length === 0) return;

      // Ordenar fichas por data/hora
      const sortedFichas = dayLeads
        .map(ficha => ({ ficha, dateTime: getFichaDateTime(ficha) }))
        .filter(item => item.dateTime !== null)
        .sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());

      if (sortedFichas.length === 0) return;

      // Se houver apenas uma ficha, considerar 0 horas trabalhadas para esse dia
      if (sortedFichas.length === 1) {
        dayCount++;
        return;
      }

      // Calcular diferença entre primeira e última ficha
      const firstFicha = sortedFichas[0].dateTime!;
      const lastFicha = sortedFichas[sortedFichas.length - 1].dateTime!;
      const hoursWorked = differenceInHours(lastFicha, firstFicha, { roundingMethod: 'round' });

      totalHours += hoursWorked;
      dayCount++;
    });
  });

  return {
    totalHours,
    averageHoursPerDay: dayCount > 0 ? totalHours / dayCount : 0,
    dayCount
  };
}

/**
 * Calcula o tempo médio entre fichas por dia por scouter
 */
export function calculateAverageTimeBetweenFichas(fichas: Lead[]): {
  averageMinutes: number;
  totalIntervals: number;
} {
  const grouped = groupFichasByScouterAndDate(fichas);
  let totalMinutes = 0;
  let intervalCount = 0;

  Object.values(grouped).forEach(scouterDays => {
    Object.values(scouterDays).forEach(dayLeads => {
      if (dayLeads.length < 2) {
        // Não há intervalos se houver menos de 2 fichas
        return;
      }

      // Ordenar fichas por data/hora
      const sortedFichas = dayLeads
        .map(ficha => ({ ficha, dateTime: getFichaDateTime(ficha) }))
        .filter(item => item.dateTime !== null)
        .sort((a, b) => a.dateTime!.getTime() - b.dateTime!.getTime());

      if (sortedFichas.length < 2) return;

      // Calcular intervalos entre fichas consecutivas
      for (let i = 1; i < sortedFichas.length; i++) {
        const prevFicha = sortedFichas[i - 1].dateTime!;
        const currentFicha = sortedFichas[i].dateTime!;
        const minutesBetween = differenceInMinutes(currentFicha, prevFicha);

        totalMinutes += minutesBetween;
        intervalCount++;
      }
    });
  });

  return {
    averageMinutes: intervalCount > 0 ? totalMinutes / intervalCount : 0,
    totalIntervals: intervalCount
  };
}

/**
 * Formata minutos em formato legível (ex: "45 min" ou "2h 30min")
 */
export function formatMinutesToReadable(minutes: number): string {
  if (minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Formata horas em formato legível (ex: "8h" ou "8.5h")
 */
export function formatHoursToReadable(hours: number): string {
  if (hours === 0) return '0h';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours}h`;
  } else {
    return `${wholeHours}h ${minutes}min`;
  }
}
