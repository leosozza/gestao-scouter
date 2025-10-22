import { useEffect, useState } from 'react';
import { useErrorHunt } from '@/contexts/ErrorHuntContext';

export function ErrorHuntOverlay() {
  const { isActive, captureElementContext } = useErrorHunt();
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isActive) {
      setHighlightedElement(null);
      return;
    }

    let clickCount = 0;
    let clickTimeout: NodeJS.Timeout;

    const handleClick = (e: MouseEvent) => {
      clickCount++;
      
      if (clickCount === 1) {
        clickTimeout = setTimeout(() => {
          clickCount = 0;
        }, 300);
      } else if (clickCount === 2) {
        clearTimeout(clickTimeout);
        clickCount = 0;
        
        // Double click detected
        e.preventDefault();
        e.stopPropagation();
        
        const target = e.target as HTMLElement;
        captureElementContext(target, e);
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === document.body) return;

      const rect = target.getBoundingClientRect();
      setHighlightedElement(target);
      setHighlightStyle({
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '2px solid hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        pointerEvents: 'none',
        zIndex: 9998,
        transition: 'all 0.1s ease',
      });
    };

    const handleMouseOut = () => {
      setHighlightedElement(null);
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [isActive, captureElementContext]);

  if (!isActive) return null;

  return (
    <>
      {/* Overlay hint */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <span className="text-sm font-medium">🔍 Modo Caça Erro Ativo - Duplo-clique em qualquer elemento</span>
        </div>
      </div>

      {/* Highlight overlay */}
      {highlightedElement && <div style={highlightStyle} />}
    </>
  );
}
