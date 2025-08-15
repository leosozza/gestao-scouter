
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { currentTheme, applyTheme } = useTheme();

  useEffect(() => {
    // Aplica o tema salvo no localStorage quando a aplicação inicia
    const savedTheme = localStorage.getItem('maxfama_theme');
    if (savedTheme) {
      applyTheme(savedTheme as any);
    }
  }, [applyTheme]);

  return <>{children}</>;
};
