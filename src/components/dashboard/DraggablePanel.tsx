
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Minimize2, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggablePanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isCollapsed: boolean;
  isEditMode: boolean;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onResize: (id: string, size: { width: number; height: number }) => void;
  onToggleCollapse: (id: string) => void;
  onRemove?: (id: string) => void;
  minWidth?: number;
  minHeight?: number;
  className?: string;
}

export const DraggablePanel = ({
  id,
  title,
  children,
  position,
  size,
  isCollapsed,
  isEditMode,
  onMove,
  onResize,
  onToggleCollapse,
  onRemove,
  minWidth = 300,
  minHeight = 200,
  className
}: DraggablePanelProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const panelRef = useRef<HTMLDivElement>(null);

  // Constrain position to viewport bounds
  const constrainPosition = (pos: { x: number; y: number }) => {
    const maxX = Math.max(0, window.innerWidth - size.width);
    const maxY = Math.max(0, window.innerHeight - size.height);
    
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY))
    };
  };

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    if (e.target !== e.currentTarget && !e.currentTarget.contains(e.target as Node)) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Handle resize
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPos = constrainPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
        onMove(id, newPos);
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(minWidth, Math.min(resizeStart.width + deltaX, window.innerWidth - position.x));
        const newHeight = Math.max(minHeight, Math.min(resizeStart.height + deltaY, window.innerHeight - position.y));
        onResize(id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, id, onMove, onResize, minWidth, minHeight, position]);

  // Responsive size adjustments
  const responsiveSize = {
    width: Math.min(size.width, window.innerWidth - 40),
    height: isCollapsed ? 'auto' : Math.min(size.height, window.innerHeight - 40)
  };

  const responsivePosition = constrainPosition(position);

  return (
    <Card
      ref={panelRef}
      className={cn(
        'absolute shadow-lg border-2 transition-all duration-200',
        isDragging && 'shadow-2xl border-primary/50 z-50',
        isResizing && 'shadow-2xl border-primary/50 z-50',
        isEditMode && 'ring-2 ring-primary/20',
        'bg-background/95 backdrop-blur-sm',
        className
      )}
      style={{
        left: responsivePosition.x,
        top: responsivePosition.y,
        width: responsiveSize.width,
        height: responsiveSize.height,
        zIndex: isDragging || isResizing ? 1000 : isEditMode ? 10 : 1
      }}
    >
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-2 select-none",
          isEditMode && "cursor-move"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          {isEditMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        
        <div className={cn("flex items-center gap-1", !isEditMode && "opacity-50")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleCollapse(id)}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <Minimize2 className="h-3 w-3" />
            )}
          </Button>
          
          {isEditMode && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(id)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <>
          <CardContent className="pt-0 overflow-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
            {children}
          </CardContent>
          
          {/* Resize handle - only visible in edit mode */}
          {isEditMode && (
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-primary/20 hover:bg-primary/40 transition-colors"
              onMouseDown={handleResizeMouseDown}
              style={{
                background: 'linear-gradient(-45deg, transparent 30%, currentColor 30%, currentColor 40%, transparent 40%, transparent 60%, currentColor 60%, currentColor 70%, transparent 70%)'
              }}
            />
          )}
        </>
      )}
    </Card>
  );
};
