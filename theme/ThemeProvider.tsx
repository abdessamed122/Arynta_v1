import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme, PixelRatio, AccessibilityInfo } from 'react-native';
import { tokens } from '../design-tokens';

export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: Exclude<ColorSchemeName, 'no-preference'>; // 'light' | 'dark'
  setMode: (m: Exclude<ColorSchemeName, 'no-preference'>) => void;
  resolvedMode: Exclude<ColorSchemeName, 'no-preference'>;
  colorModeSetting: ColorMode; // user chosen setting including 'system'
  setColorModeSetting: (m: ColorMode) => void;
  isDark: boolean;
  t: typeof tokens; // full token object for raw access
  color: typeof tokens.semantic.light.color; // active semantic colors
  spacing: typeof tokens.spacing;
  radii: typeof tokens.radii;
  typography: typeof tokens.typography;
  shadows: typeof tokens.shadows;
  gradients: typeof tokens.gradients;
  scaleFont: (size: number) => number; // accessibility scaling function
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const prefersDark = () => (Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light');

// Will be updated once we fetch actual accessibility font scale
const DEFAULT_BASE_FONT_SCALE = 1;

export const ThemeProvider: React.FC<React.PropsWithChildren<{ initialColorMode?: ColorMode }>> = ({
  children,
  initialColorMode = 'system',
}) => {
  const systemScheme = useColorScheme();
  const [colorModeSetting, setColorModeSetting] = useState<ColorMode>(initialColorMode);
  const [mode, setMode] = useState<Exclude<ColorSchemeName, 'no-preference'>>(
    initialColorMode === 'system' ? prefersDark() : (initialColorMode as Exclude<ColorSchemeName, 'no-preference'>)
  );

  // React to system changes when in system mode
  useEffect(() => {
    if (colorModeSetting === 'system' && systemScheme) {
      setMode(systemScheme === 'dark' ? 'dark' : 'light');
    }
  }, [systemScheme, colorModeSetting]);

  const resolvedMode: Exclude<ColorSchemeName, 'no-preference'> = mode;
  const isDark = resolvedMode === 'dark';

  const color = isDark ? tokens.semantic.dark.color : tokens.semantic.light.color;

  const [fontScale, setFontScale] = useState<number>(PixelRatio.getFontScale?.() || DEFAULT_BASE_FONT_SCALE);

  useEffect(() => {
    // Subscribe to font scaling changes (some platforms)
    const listener = AccessibilityInfo.addEventListener?.('reduceMotionChanged', () => {});
    const interval = setInterval(() => {
      // Polling approach because RN does not yet expose a font scale event cross-platform
      const current = PixelRatio.getFontScale?.() || DEFAULT_BASE_FONT_SCALE;
      setFontScale(prev => (Math.abs(prev - current) > 0.01 ? current : prev));
    }, 1500);
    return () => {
      if (listener && 'remove' in listener) (listener as any).remove();
      clearInterval(interval);
    };
  }, []);

  const scaleFont = useCallback((size: number) => {
    // Clamp scaling to avoid huge layouts breaking
    const clamped = Math.min(fontScale, 1.6);
    return size * clamped;
  }, [fontScale]);

  const value: ThemeContextValue = useMemo(
    () => ({
      mode,
      setMode: (m: Exclude<ColorSchemeName, 'no-preference'>) => {
        setColorModeSetting(m as ColorMode);
        setMode(m);
      },
      resolvedMode,
      colorModeSetting,
      setColorModeSetting: (m) => {
        setColorModeSetting(m);
        if (m === 'system') {
          setMode(prefersDark());
        } else {
          setMode(m);
        }
      },
      isDark,
      t: tokens,
      color,
      spacing: tokens.spacing,
      radii: tokens.radii,
      typography: tokens.typography,
      shadows: tokens.shadows,
      gradients: tokens.gradients,
      scaleFont,
  }), [mode, resolvedMode, colorModeSetting, isDark, color, scaleFont]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Convenience hook to read colors quickly
export function useColor() {
  return useTheme().color;
}

// HOC for class components if ever needed
export function withTheme<P extends object>(Component: React.ComponentType<P & { theme: ThemeContextValue }>) {
  return function ThemedComponent(props: P) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
}
