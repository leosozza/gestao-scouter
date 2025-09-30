import { 
  calculateWorkingHours, 
  calculateAverageTimeBetweenFichas,
  formatHoursToReadable,
  formatMinutesToReadable
} from '../scouterMetrics';
import type { Ficha } from '@/repositories/types';

describe('scouterMetrics', () => {
  describe('calculateWorkingHours', () => {
    test('should calculate working hours with multiple fichas in a day', () => {
      const fichas: Ficha[] = [
        {
          id: 1,
          scouter: 'Carlos Silva',
          criado: '15/09/2024',
          hora_criacao_ficha: '09:00'
        },
        {
          id: 2,
          scouter: 'Carlos Silva',
          criado: '15/09/2024',
          hora_criacao_ficha: '12:30'
        },
        {
          id: 3,
          scouter: 'Carlos Silva',
          criado: '15/09/2024',
          hora_criacao_ficha: '17:00'
        }
      ];

      const result = calculateWorkingHours(fichas);
      expect(result.totalHours).toBe(8); // 09:00 to 17:00 = 8 hours
      expect(result.averageHoursPerDay).toBe(8);
      expect(result.dayCount).toBe(1);
    });

    test('should handle single ficha per day (0 hours)', () => {
      const fichas: Ficha[] = [
        {
          id: 1,
          scouter: 'Maria Santos',
          criado: '15/09/2024',
          hora_criacao_ficha: '10:00'
        }
      ];

      const result = calculateWorkingHours(fichas);
      expect(result.totalHours).toBe(0);
      expect(result.averageHoursPerDay).toBe(0);
      expect(result.dayCount).toBe(1);
    });

    test('should use datahoracel as fallback', () => {
      const fichas: Ficha[] = [
        {
          id: 1,
          scouter: 'Pedro Costa',
          datahoracel: '15/09/2024 08:00'
        },
        {
          id: 2,
          scouter: 'Pedro Costa',
          datahoracel: '15/09/2024 16:00'
        }
      ];

      const result = calculateWorkingHours(fichas);
      expect(result.totalHours).toBe(8);
      expect(result.dayCount).toBe(1);
    });

    test('should handle multiple scouters and days', () => {
      const fichas: Ficha[] = [
        // Scouter 1 - Day 1
        { id: 1, scouter: 'Carlos', criado: '15/09/2024', hora_criacao_ficha: '09:00' },
        { id: 2, scouter: 'Carlos', criado: '15/09/2024', hora_criacao_ficha: '17:00' },
        // Scouter 1 - Day 2
        { id: 3, scouter: 'Carlos', criado: '16/09/2024', hora_criacao_ficha: '10:00' },
        { id: 4, scouter: 'Carlos', criado: '16/09/2024', hora_criacao_ficha: '18:00' },
        // Scouter 2 - Day 1
        { id: 5, scouter: 'Maria', criado: '15/09/2024', hora_criacao_ficha: '08:00' },
        { id: 6, scouter: 'Maria', criado: '15/09/2024', hora_criacao_ficha: '14:00' }
      ];

      const result = calculateWorkingHours(fichas);
      // Carlos: 8h + 8h = 16h, Maria: 6h = 22h total
      expect(result.totalHours).toBe(22);
      // 3 days total (Carlos x2, Maria x1)
      expect(result.dayCount).toBe(3);
      // Average: 22/3 = 7.33
      expect(result.averageHoursPerDay).toBeCloseTo(7.33, 1);
    });

    test('should ignore fichas without valid timestamps', () => {
      const fichas: Ficha[] = [
        { id: 1, scouter: 'Carlos', criado: '15/09/2024', hora_criacao_ficha: '09:00' },
        { id: 2, scouter: 'Carlos' }, // No timestamp
        { id: 3, scouter: 'Carlos', criado: '15/09/2024', hora_criacao_ficha: '17:00' }
      ];

      const result = calculateWorkingHours(fichas);
      expect(result.totalHours).toBe(8);
    });
  });

  describe('calculateAverageTimeBetweenFichas', () => {
    test('should calculate average time between fichas', () => {
      const fichas: Ficha[] = [
        {
          id: 1,
          scouter: 'Carlos Silva',
          criado: '15/09/2024',
          hora_criacao_ficha: '09:00'
        },
        {
          id: 2,
          scouter: 'Carlos Silva',
          criado: '15/09/2024',
          hora_criacao_ficha: '10:30'
        },
        {
          id: 3,
          scouter: 'Carlos Silva',
          criado: '15/09/2024',
          hora_criacao_ficha: '12:00'
        }
      ];

      const result = calculateAverageTimeBetweenFichas(fichas);
      // Intervals: 90 min (09:00-10:30) + 90 min (10:30-12:00) = 180 min total
      // Average: 180/2 = 90 min
      expect(result.averageMinutes).toBe(90);
      expect(result.totalIntervals).toBe(2);
    });

    test('should return 0 for single ficha', () => {
      const fichas: Ficha[] = [
        {
          id: 1,
          scouter: 'Maria Santos',
          criado: '15/09/2024',
          hora_criacao_ficha: '10:00'
        }
      ];

      const result = calculateAverageTimeBetweenFichas(fichas);
      expect(result.averageMinutes).toBe(0);
      expect(result.totalIntervals).toBe(0);
    });

    test('should handle multiple scouters', () => {
      const fichas: Ficha[] = [
        // Carlos: 60 min interval
        { id: 1, scouter: 'Carlos', criado: '15/09/2024', hora_criacao_ficha: '09:00' },
        { id: 2, scouter: 'Carlos', criado: '15/09/2024', hora_criacao_ficha: '10:00' },
        // Maria: 30 min interval
        { id: 3, scouter: 'Maria', criado: '15/09/2024', hora_criacao_ficha: '09:00' },
        { id: 4, scouter: 'Maria', criado: '15/09/2024', hora_criacao_ficha: '09:30' }
      ];

      const result = calculateAverageTimeBetweenFichas(fichas);
      // (60 + 30) / 2 = 45
      expect(result.averageMinutes).toBe(45);
      expect(result.totalIntervals).toBe(2);
    });
  });

  describe('formatHoursToReadable', () => {
    test('should format whole hours', () => {
      expect(formatHoursToReadable(8)).toBe('8h');
      expect(formatHoursToReadable(0)).toBe('0h');
    });

    test('should format hours with minutes', () => {
      expect(formatHoursToReadable(8.5)).toBe('8h 30min');
      expect(formatHoursToReadable(2.25)).toBe('2h 15min');
    });
  });

  describe('formatMinutesToReadable', () => {
    test('should format minutes only', () => {
      expect(formatMinutesToReadable(45)).toBe('45 min');
      expect(formatMinutesToReadable(0)).toBe('0 min');
    });

    test('should format hours and minutes', () => {
      expect(formatMinutesToReadable(90)).toBe('1h 30min');
      expect(formatMinutesToReadable(120)).toBe('2h');
      expect(formatMinutesToReadable(150)).toBe('2h 30min');
    });
  });
});
