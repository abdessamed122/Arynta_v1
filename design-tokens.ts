// Central design tokens for the app. These are raw primitives only.
// No component-specific styling here. Keep values semantic-friendly.

export const palette = {
  // Neutral / Gray scale (tuned for dark & light blending)
  gray0: '#FFFFFF',
  gray1: '#F5F6F7',
  gray2: '#ECEEF0',
  gray3: '#D9DCDF',
  gray4: '#B7BCC1',
  gray5: '#8A9299',
  gray6: '#5C656E',
  gray7: '#3B444D',
  gray8: '#262D34',
  gray9: '#171C21',
  gray10: '#0E1114',

  // Brand primary scale
  brand50: '#E6F7FF',
  brand100: '#B3E7FF',
  brand200: '#80D6FF',
  brand300: '#4DC6FF',
  brand400: '#26B9FF',
  brand500: '#009DFF', // primary base
  brand600: '#007ACC',
  brand700: '#005A99',
  brand800: '#003D66',
  brand900: '#002033',

  // Accent (secondary highlight)
  accent50: '#FFF5E6',
  accent100: '#FFE3B3',
  accent200: '#FFD180',
  accent300: '#FFBE4D',
  accent400: '#FFB026',
  accent500: '#FF9800',
  accent600: '#DB7D00',
  accent700: '#B76400',
  accent800: '#924C00',
  accent900: '#5E3000',

  // Semantic (status)
  success: '#1FA971',
  successBg: '#E6F7F1',
  warning: '#D99000',
  warningBg: '#FFF7E6',
  danger: '#D93025',
  dangerBg: '#FDECEA',
  info: '#0A7EA4',
  infoBg: '#E5F6FB',
};

export const typography = {
  fontFamilySans: 'System',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  // Scales based on a 1.125 (major second) ratio off 16 base.
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.4,
    relaxed: 1.6,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
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
};

export const radii = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

export const shadows = {
  // Use elevation mapping on native later
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const gradients = {
  brand: ['#009DFF', '#005A99'],
  surface: ['#FFFFFF', '#F5F6F7'],
  surfaceDark: ['#171C21', '#0E1114'],
};

// Semantic tokens map raw tokens to meaning (supports theming overrides)
export const semantic = {
  light: {
    color: {
      bg: palette.gray0,
      bgAlt: palette.gray1,
      surface: palette.gray0,
      surfaceAlt: palette.gray1,
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
      bg: palette.gray9,
      bgAlt: palette.gray8,
      surface: palette.gray8,
      surfaceAlt: palette.gray7,
      text: palette.gray1,
      textAlt: palette.gray4,
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
      successBg: '#0F3326',
      warningBg: '#332400',
      dangerBg: '#3B0E0B',
      infoBg: '#062733',
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
