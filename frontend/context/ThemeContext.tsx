'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getUserPreferences, saveUserPreferences } from '../services/auth';

export type ThemeMode = 'light' | 'dark';

export type PaletteId = 'corporativo' | 'oro-luxury' | 'esmeralda' | 'zafiro' | 'borgona';

export interface PaletteDefinition {
  id: PaletteId;
  name: string;
  description?: string;
  primary: string;
  primaryHover: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  previewGradient: string;
}

export const PALETTES: Record<PaletteId, PaletteDefinition> = {
  corporativo: {
    id: 'corporativo',
    name: 'Azul Marino y Rojo',
    primary: '#0A193D',
    primaryHover: '#14295c',
    accent: '#CC1F26',
    accentHover: '#b3171d',
    accentSoft: '#fee2e2',
    previewGradient: 'from-[#0A193D] to-[#CC1F26]',
  },
  'oro-luxury': {
    id: 'oro-luxury',
    name: 'Negro y Dorado',
    primary: '#0f172a',
    primaryHover: '#1e293b',
    accent: '#D4AF37',
    accentHover: '#bfa132',
    accentSoft: '#fef3c7',
    previewGradient: 'from-[#0f172a] to-[#D4AF37]',
  },
  esmeralda: {
    id: 'esmeralda',
    name: 'Verde Esmeralda',
    primary: '#064E3B',
    primaryHover: '#0a634c',
    accent: '#10B981',
    accentHover: '#059669',
    accentSoft: '#d1fae5',
    previewGradient: 'from-[#064E3B] to-[#10B981]',
  },
  zafiro: {
    id: 'zafiro',
    name: 'Azul Real y Cyan',
    primary: '#1E3A8A',
    primaryHover: '#172554',
    accent: '#0284C7',
    accentHover: '#0369a1',
    accentSoft: '#e0f2fe',
    previewGradient: 'from-[#1E3A8A] to-[#0284C7]',
  },
  borgona: {
    id: 'borgona',
    name: 'Bordó y Rubí',
    primary: '#4C0519',
    primaryHover: '#700c27',
    accent: '#E11D48',
    accentHover: '#be123c',
    accentSoft: '#ffe4e6',
    previewGradient: 'from-[#4C0519] to-[#E11D48]',
  },
};

interface ThemeContextType {
  theme: ThemeMode;
  palette: PaletteId;
  currentPalette: PaletteDefinition;
  palettes: PaletteDefinition[];
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPalette: (palette: PaletteId) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = localStorage.getItem('inmobiliaria_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [palette, setPaletteState] = useState<PaletteId>(() => {
    if (typeof window === 'undefined') return 'corporativo';
    const savedPalette = localStorage.getItem('inmobiliaria_palette') as PaletteId | null;
    return savedPalette && PALETTES[savedPalette] ? savedPalette : 'corporativo';
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Las preferencias remotas pertenecen a la cuenta y sobrescriben el respaldo local.
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || user.role !== 'admin') {
      return;
    }

    getUserPreferences().then((preferences) => {
      if (preferences && (preferences.tema === 'light' || preferences.tema === 'dark') && PALETTES[preferences.paleta as PaletteId]) {
        setThemeState(preferences.tema);
        setPaletteState(preferences.paleta as PaletteId);
      }
      setPreferencesLoaded(true);
    });
  }, [isAuthLoading, user]);

  // Aplicar clases y atributos CSS globales al documento cuando el tema cambia
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-palette', palette);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const current = PALETTES[palette] || PALETTES.corporativo;
    root.style.setProperty('--brand-primary', current.primary);
    root.style.setProperty('--brand-primary-hover', current.primaryHover);
    root.style.setProperty('--brand-accent', current.accent);
    root.style.setProperty('--brand-accent-hover', current.accentHover);
    root.style.setProperty('--brand-accent-soft', current.accentSoft);

    try {
      localStorage.setItem('inmobiliaria_theme', theme);
      localStorage.setItem('inmobiliaria_palette', palette);
    } catch {
      // ignore
    }
  }, [theme, palette]);

  useEffect(() => {
    if (!preferencesLoaded || !user || user.role !== 'admin') return;
    void saveUserPreferences({ tema: theme, paleta: palette });
  }, [theme, palette, preferencesLoaded, user]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setPalette = (newPalette: PaletteId) => {
    if (PALETTES[newPalette]) {
      setPaletteState(newPalette);
    }
  };

  const currentPalette = useMemo(() => PALETTES[palette] || PALETTES.corporativo, [palette]);
  const palettesList = useMemo(() => Object.values(PALETTES), []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        palette,
        currentPalette,
        palettes: palettesList,
        setTheme,
        toggleTheme,
        setPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
