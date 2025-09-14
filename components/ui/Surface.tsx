/**
 * Surface component
 * - Provides elevation (mapped to shadow tokens) and padding options
 * - Interactive flag adds a subtle border highlight for clickable regions
 * - Forms the base building block for Card and other containers
 */
import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface SurfaceProps extends ViewProps {
  level?: 0 | 1 | 2; // elevation depth
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: boolean;
  interactive?: boolean; // if true, subtle border highlight
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  style,
  level = 0,
  padding = 'none',
  rounded = true,
  interactive,
  ...rest
}) => {
  const { color, spacing, radii, shadows } = useTheme();

  const padLookup = { none: 0, sm: spacing.sm, md: spacing.md, lg: spacing.lg } as const;
  let elevationStyle: any = {};
  if (level === 1) elevationStyle = shadows.sm;
  else if (level === 2) elevationStyle = shadows.md;
  const bg = level > 0 ? color.surface : color.bg;

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          padding: padLookup[padding],
          borderRadius: rounded ? radii.lg : radii.none,
          borderWidth: interactive ? 1 : 0,
          borderColor: interactive ? color.border : 'transparent',
        },
        elevationStyle as any,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

export default Surface;
