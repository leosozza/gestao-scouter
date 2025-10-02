/**
 * Date Filter Component
 * Allows filtering fichas by date range without auto-filtering
 */
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[9999] bg-white/95 rounded-lg shadow-lg border backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 px-2 py-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-center w-8 h-8 hover:bg-accent rounded-lg transition-colors">
              <Calendar size={18} className="text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="flex items-center gap-2">
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
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
