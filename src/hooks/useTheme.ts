
import { useState, useEffect } from 'react';

export type Theme = 
  | 'light' 
  | 'dark' 
  | 'blue' 
  | 'green' 
  | 'purple' 
  | 'pink' 
  | 'orange' 
  | 'red' 
  | 'cyan' 
  | 'yellow' 
  | 'dark-blue'
  | 'corporate'
  | 'analytics'
  | 'medical'
  | 'presentation'
  | 'dark-pro';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    return (localStorage.getItem('maxfama_theme') as Theme) || 'light';
  });

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Remove todas as classes de tema existentes
    root.className = root.className.replace(/theme-\w+(-\w+)?/g, '');
    root.classList.remove('dark');
    
    // Aplica o novo tema
    switch (theme) {
      case 'dark':
        root.classList.add('dark');
        break;
      case 'light':
        // Não adiciona classe adicional para light theme
        break;
      case 'dark-blue':
        root.classList.add('theme-dark-blue');
        break;
      case 'dark-pro':
        root.classList.add('theme-dark-pro');
        break;
      default:
        root.classList.add(`theme-${theme}`);
        break;
    }
    
    setCurrentTheme(theme);
    localStorage.setItem('maxfama_theme', theme);
  };

  const getThemeName = (theme: Theme): string => {
    const themeNames: Record<Theme, string> = {
      light: 'Claro',
      dark: 'Escuro',
      blue: 'Azul',
      green: 'Verde',
      purple: 'Roxo',
      pink: 'Rosa',
      orange: 'Laranja',
      red: 'Vermelho',
      cyan: 'Ciano',
      yellow: 'Amarelo',
      'dark-blue': 'Azul Escuro',
      corporate: 'Corporate',
      analytics: 'Analytics',
      medical: 'Medical',
      presentation: 'Apresentação',
      'dark-pro': 'Dark Pro'
    };
    return themeNames[theme] || theme;
  };

  const getChartColors = (theme: Theme): string[] => {
    const chartColorsByTheme: Record<Theme, string[]> = {
      light: [
        'hsl(213, 94%, 68%)',
        'hsl(142, 71%, 45%)',
        'hsl(25, 95%, 53%)',
        'hsl(0, 84%, 60%)',
        'hsl(280, 100%, 70%)'
      ],
      dark: [
        'hsl(220, 70%, 50%)',
        'hsl(160, 60%, 45%)',
        'hsl(30, 80%, 55%)',
        'hsl(340, 75%, 55%)',
        'hsl(280, 65%, 60%)'
      ],
      blue: [
        'hsl(214, 94%, 58%)',
        'hsl(195, 100%, 50%)',
        'hsl(204, 100%, 60%)',
        'hsl(224, 76%, 48%)',
        'hsl(234, 89%, 64%)'
      ],
      green: [
        'hsl(142, 76%, 36%)',
        'hsl(120, 100%, 25%)',
        'hsl(134, 61%, 41%)',
        'hsl(158, 64%, 52%)',
        'hsl(173, 58%, 39%)'
      ],
      purple: [
        'hsl(280, 100%, 70%)',
        'hsl(270, 100%, 60%)',
        'hsl(290, 100%, 65%)',
        'hsl(260, 100%, 55%)',
        'hsl(300, 100%, 75%)'
      ],
      pink: [
        'hsl(330, 81%, 60%)',
        'hsl(340, 82%, 52%)',
        'hsl(320, 85%, 65%)',
        'hsl(350, 89%, 60%)',
        'hsl(310, 78%, 70%)'
      ],
      orange: [
        'hsl(25, 95%, 53%)',
        'hsl(35, 91%, 65%)',
        'hsl(15, 100%, 50%)',
        'hsl(45, 93%, 58%)',
        'hsl(55, 91%, 64%)'
      ],
      red: [
        'hsl(0, 84%, 60%)',
        'hsl(10, 91%, 59%)',
        'hsl(350, 89%, 60%)',
        'hsl(20, 83%, 65%)',
        'hsl(340, 82%, 52%)'
      ],
      cyan: [
        'hsl(180, 100%, 40%)',
        'hsl(170, 100%, 35%)',
        'hsl(190, 100%, 45%)',
        'hsl(160, 100%, 30%)',
        'hsl(200, 100%, 50%)'
      ],
      yellow: [
        'hsl(45, 93%, 47%)',
        'hsl(35, 91%, 65%)',
        'hsl(55, 91%, 64%)',
        'hsl(25, 95%, 53%)',
        'hsl(65, 92%, 76%)'
      ],
      'dark-blue': [
        'hsl(217, 91%, 60%)',
        'hsl(200, 91%, 60%)',
        'hsl(230, 91%, 60%)',
        'hsl(250, 91%, 60%)',
        'hsl(270, 91%, 60%)'
      ],
      corporate: [
        'hsl(220, 50%, 55%)',
        'hsl(210, 45%, 60%)',
        'hsl(200, 40%, 65%)',
        'hsl(190, 35%, 70%)',
        'hsl(180, 30%, 75%)'
      ],
      analytics: [
        'hsl(260, 100%, 65%)',
        'hsl(200, 100%, 60%)',
        'hsl(120, 100%, 50%)',
        'hsl(30, 100%, 55%)',
        'hsl(0, 100%, 65%)'
      ],
      medical: [
        'hsl(250, 80%, 65%)',
        'hsl(270, 75%, 60%)',
        'hsl(290, 70%, 65%)',
        'hsl(310, 65%, 70%)',
        'hsl(200, 70%, 60%)'
      ],
      presentation: [
        'hsl(210, 85%, 60%)',
        'hsl(160, 80%, 50%)',
        'hsl(40, 90%, 55%)',
        'hsl(320, 75%, 65%)',
        'hsl(20, 85%, 60%)'
      ],
      'dark-pro': [
        'hsl(180, 100%, 50%)',
        'hsl(280, 100%, 70%)',
        'hsl(120, 100%, 60%)',
        'hsl(60, 100%, 65%)',
        'hsl(0, 100%, 70%)'
      ]
    };
    
    return chartColorsByTheme[theme] || chartColorsByTheme.light;
  };

  // Aplica o tema inicial quando o hook é montado
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  return {
    currentTheme,
    applyTheme,
    getThemeName,
    getChartColors
  };
};
