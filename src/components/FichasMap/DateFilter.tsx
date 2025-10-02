/**
 * Date Filter Component
 * Allows filtering fichas by date range without auto-filtering
 */
import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function DateFilter({ 
  startDate, 
  endDate, 
  onDateChange, 
  onApply,
  onClear 
}: DateFilterProps) {
  return (
    <div className="absolute top-4 left-4 z-[9999] flex items-center gap-2 bg-white/95 rounded-lg shadow-lg px-3 py-2 border backdrop-blur-sm">
      <Calendar size={16} className="text-muted-foreground" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onDateChange(e.target.value, endDate)}
        className="text-xs border rounded px-2 py-1 outline-none"
        style={{ width: 120 }}
      />
      <span className="text-xs text-muted-foreground">até</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onDateChange(startDate, e.target.value)}
        className="text-xs border rounded px-2 py-1 outline-none"
        style={{ width: 120 }}
      />
      <Button
        size="sm"
        onClick={onApply}
        className="h-7 px-3 text-xs"
      >
        Aplicar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onClear}
        className="h-7 px-3 text-xs"
      >
        Limpar
      </Button>
    </div>
  );
}
