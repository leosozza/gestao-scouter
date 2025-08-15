
import { useState, useEffect } from 'react';

export type Theme = 
  | 'modern-blue'
  | 'vibrant-purple' 
  | 'nature-green'
  | 'sunset-orange'
  | 'elegant-dark';

export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    return (localStorage.getItem('maxfama_theme') as Theme) || 'modern-blue';
  });

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Remove todas as classes de tema existentes
    root.className = root.className.replace(/theme-\w+(-\w+)?/g, '');
    root.classList.remove('dark');
    
    // Aplica o novo tema
    root.classList.add(`theme-${theme}`);
    
    setCurrentTheme(theme);
    localStorage.setItem('maxfama_theme', theme);
  };

  const getThemeName = (theme: Theme): string => {
    const themeNames: Record<Theme, string> = {
      'modern-blue': 'Azul Moderno',
      'vibrant-purple': 'Roxo Vibrante',
      'nature-green': 'Verde Natural',
      'sunset-orange': 'Laranja Pôr do Sol',
      'elegant-dark': 'Escuro Elegante'
    };
    return themeNames[theme] || theme;
  };

  const getChartColors = (theme: Theme): string[] => {
    const chartColorsByTheme: Record<Theme, string[]> = {
      'modern-blue': [
        'hsl(213, 94%, 68%)',  // Azul principal
        'hsl(195, 100%, 50%)', // Azul claro
        'hsl(204, 100%, 60%)', // Azul médio
        'hsl(224, 76%, 48%)',  // Azul escuro
        'hsl(234, 89%, 64%)'   // Azul violeta
      ],
      'vibrant-purple': [
        'hsl(280, 100%, 70%)', // Roxo vibrante
        'hsl(270, 100%, 60%)', // Roxo médio
        'hsl(290, 100%, 65%)', // Magenta
        'hsl(260, 100%, 55%)', // Roxo escuro
        'hsl(300, 100%, 75%)'  // Rosa roxo
      ],
      'nature-green': [
        'hsl(142, 76%, 36%)',  // Verde principal
        'hsl(120, 100%, 25%)', // Verde escuro
        'hsl(134, 61%, 41%)',  // Verde médio
        'hsl(158, 64%, 52%)',  // Verde água
        'hsl(173, 58%, 39%)'   // Verde azulado
      ],
      'sunset-orange': [
        'hsl(25, 95%, 53%)',   // Laranja principal
        'hsl(35, 91%, 65%)',   // Laranja claro
        'hsl(15, 100%, 50%)',  // Laranja avermelhado
        'hsl(45, 93%, 58%)',   // Amarelo laranja
        'hsl(55, 91%, 64%)'    // Amarelo
      ],
      'elegant-dark': [
        'hsl(180, 100%, 50%)', // Ciano
        'hsl(280, 100%, 70%)', // Magenta
        'hsl(120, 100%, 60%)', // Verde neon
        'hsl(60, 100%, 65%)',  // Amarelo neon
        'hsl(0, 100%, 70%)'    // Vermelho neon
      ]
    };
    
    return chartColorsByTheme[theme] || chartColorsByTheme['modern-blue'];
  };

  const getThemeConfig = (theme: Theme) => {
    const configs = {
      'modern-blue': {
        cardStyle: 'clean',
        shadowIntensity: 'light',
        borderRadius: 'medium',
        gradient: false
      },
      'vibrant-purple': {
        cardStyle: 'vibrant',
        shadowIntensity: 'medium',
        borderRadius: 'large',
        gradient: true
      },
      'nature-green': {
        cardStyle: 'organic',
        shadowIntensity: 'soft',
        borderRadius: 'large',
        gradient: false
      },
      'sunset-orange': {
        cardStyle: 'warm',
        shadowIntensity: 'medium',
        borderRadius: 'medium',
        gradient: true
      },
      'elegant-dark': {
        cardStyle: 'futuristic',
        shadowIntensity: 'strong',
        borderRadius: 'small',
        gradient: true
      }
    };
    
    return configs[theme];
  };

  // Aplica o tema inicial quando o hook é montado
  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  return {
    currentTheme,
    applyTheme,
    getThemeName,
    getChartColors,
    getThemeConfig
  };
};
