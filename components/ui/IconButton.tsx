/**
 * IconButton
 * - Square touch target (defaults 40px) to meet > 44 iOS tap guidelines closely
 * - Variants: plain (no bg), soft (subtle tinted), solid (primary)
 * - Allows any icon ReactNode; consumer decides color adaptation
 */
import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface IconButtonProps {
  icon: React.ReactNode;
  size?: number; // square size
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'plain' | 'soft' | 'solid';
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 40,
  onPress,
  disabled,
  variant = 'soft',
  accessibilityLabel,
  style,
}) => {
  const { color, radii, isDark } = useTheme();

  const backgroundColor = (() => {
    if (variant === 'plain') return 'transparent';
    if (variant === 'solid') return color.primary;
    return isDark ? '#1E2A33' : color.primary + '18';
  })();


  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: Math.max(size, 48),
          height: Math.max(size, 48),
          borderRadius: radii.round,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          transform: pressed ? [{ scale: 0.9 }] : undefined,
          opacity: disabled ? 0.5 : 1,
        } as ViewStyle,
        style,
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* icon should adapt to tint if it supports color prop */}
      {icon}
    </Pressable>
  );
};

export default IconButton;
