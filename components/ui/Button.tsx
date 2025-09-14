/**
 * Button primitive
 * - Variants: solid | outline | ghost | soft (kept minimal for clarity)
 * - Sizes map to consistent vertical rhythm and hit targets (36/44/52)
 * - Press feedback via scale transform; opacity for disabled state
 * - Background + text colors sourced from ThemeProvider semantic colors
 * - Avoids external dependencies to stay lightweight and portable
 */
import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, GestureResponderEvent } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}

const sizeStyle: Record<ButtonSize, { padY: number; padX: number; font: number; gap: number; minHeight: number }> = {
  sm: { padY: 6, padX: 12, font: 14, gap: 6, minHeight: 36 },
  md: { padY: 8, padX: 16, font: 16, gap: 8, minHeight: 44 },
  lg: { padY: 12, padX: 20, font: 18, gap: 10, minHeight: 52 },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid',
  size = 'md',
  disabled,
  loading,
  iconLeft,
  iconRight,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const { color, radii, typography, scaleFont, spacing, isDark } = useTheme();
  const s = sizeStyle[size];
  const isDisabled = disabled || loading;

  const background = (() => {
    if (variant === 'solid') return color.primary;
    if (variant === 'soft') return isDark ? '#1E2A33' : color.primary + '18';
    return 'transparent';
  })();

  const borderColor = (() => {
    if (variant === 'outline') return color.border;
    if (variant === 'solid') return background;
    if (variant === 'soft') return background;
    return 'transparent';
  })();

  const textColor = (() => {
    if (variant === 'solid') return '#FFFFFF';
    if (variant === 'ghost') return color.primary;
    if (variant === 'soft') return color.primary;
    return color.text;
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Math.max(s.padX, 12),
          paddingVertical: Math.max(s.padY, 10),
          minHeight: Math.max(s.minHeight, 48),
          borderRadius: radii.md,
          backgroundColor: background,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: borderColor,
          opacity: isDisabled ? 0.6 : 1,
          transform: pressed ? [{ scale: 0.97 }] : undefined,
          // Reserved for future focus styling
          gap: s.gap,
        } as ViewStyle,
        style,
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {loading && <ActivityIndicator size="small" color={textColor} style={{ marginRight: iconLeft || children ? spacing.xs : 0 }} />}
      {iconLeft}
      <Text
        style={{
          color: textColor,
            fontSize: scaleFont(s.font),
          fontWeight: typography.weight.semibold as any,
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {children}
      </Text>
      {iconRight}
    </Pressable>
  );
};

export default Button;
