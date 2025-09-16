// Central design tokens for the app. These are raw primitives only.
// No component-specific styling here. Keep values semantic-friendly.

export const palette = {
  // Neutral / Gray scale (Material Design 3.0 inspired)
  gray0: '#FFFFFF',
  gray1: '#FAFBFC',
  gray2: '#F2F4F7',
  gray3: '#E4E7EC',
  gray4: '#D0D5DD',
  gray5: '#98A2B3',
  gray6: '#667085',
  gray7: '#475467',
  gray8: '#344054',
  gray9: '#1D2939',
  gray10: '#101828',

  // Brand primary scale (Modern purple-blue gradient inspired)
  brand50: '#F0F4FF',
  brand100: '#E0E7FF',
  brand200: '#C7D2FE',
  brand300: '#A5B4FC',
  brand400: '#818CF8',
  brand500: '#6366F1', // primary base
  brand600: '#4F46E5',
  brand700: '#4338CA',
  brand800: '#3730A3',
  brand900: '#312E81',

  // Accent (modern teal for secondary actions)
  accent50: '#F0FDFA',
  accent100: '#CCFBF1',
  accent200: '#99F6E4',
  accent300: '#5EEAD4',
  accent400: '#2DD4BF',
  accent500: '#14B8A6',
  accent600: '#0D9488',
  accent700: '#0F766E',
  accent800: '#115E59',
  accent900: '#134E4A',

  // Semantic (status) - Modern and accessible
  success: '#059669',
  successBg: '#F0FDF4',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  info: '#0284C7',
  infoBg: '#F0F9FF',
};

export const typography = {
  fontFamilySans: 'System',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  // Enhanced type scale with better hierarchy
  size: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
  weight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

export const spacing = {
  none: 0,
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
  '8xl': 96,
};

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  round: 999,
};

export const shadows = {
  // Enhanced shadow system with modern depth
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12,
  },
};

export const gradients = {
  brand: ['#6366F1', '#4338CA'],
  brandAlt: ['#818CF8', '#6366F1'],
  surface: ['#FFFFFF', '#FAFBFC'],
  surfaceDark: ['#1D2939', '#101828'],
  accent: ['#14B8A6', '#0D9488'],
  sunset: ['#F59E0B', '#EF4444'],
};

// Semantic tokens map raw tokens to meaning (supports theming overrides)
export const semantic = {
  light: {
    color: {
      bg: palette.gray0,
      bgAlt: palette.gray1,
      surface: palette.gray0,
      surfaceAlt: palette.gray2,
      text: palette.gray9,
      textAlt: palette.gray6,
      border: palette.gray3,
      divider: palette.gray2,
      focus: palette.brand500,
      primary: palette.brand500,
      primaryHover: palette.brand600,
      primaryActive: palette.brand700,
      accent: palette.accent500,
      accentHover: palette.accent600,
      success: palette.success,
      warning: palette.warning,
      danger: palette.danger,
      info: palette.info,
      successBg: palette.successBg,
      warningBg: palette.warningBg,
      dangerBg: palette.dangerBg,
      infoBg: palette.infoBg,
    },
  },
  dark: {
    color: {
      bg: palette.gray10,
      bgAlt: palette.gray9,
      surface: palette.gray9,
      surfaceAlt: palette.gray8,
      text: palette.gray1,
      textAlt: palette.gray5,
      border: palette.gray7,
      divider: palette.gray8,
      focus: palette.brand400,
      primary: palette.brand400,
      primaryHover: palette.brand300,
      primaryActive: palette.brand200,
      accent: palette.accent400,
      accentHover: palette.accent300,
      success: palette.success,
      warning: palette.warning,
      danger: palette.danger,
      info: palette.info,
      successBg: '#064E3B',
      warningBg: '#451A03',
      dangerBg: '#450A0A',
      infoBg: '#0C4A6E',
    },
  },
};

export type DesignTokens = {
  palette: typeof palette;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  gradients: typeof gradients;
  semantic: typeof semantic;
};

export const tokens: DesignTokens = {
  palette,
  typography,
  spacing,
  radii,
  shadows,
  gradients,
  semantic,
};
