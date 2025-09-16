/**
 * IconButton
 * - Enhanced with modern ripple-like effects and better accessibility
 * - Square touch target (defaults 40px) to meet > 44 iOS tap guidelines closely
 * - Variants: plain (no bg), soft (subtle tinted), solid (primary)
 * - Allows any icon ReactNode; consumer decides color adaptation
 * - Added haptic feedback and modern animations
 */
import React from 'react';
import { Pressable, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface IconButtonProps {
  icon: React.ReactNode;
  size?: number; // square size
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'plain' | 'soft' | 'solid';
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
  hapticFeedback?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  size = 40,
  onPress,
  disabled,
  variant = 'soft',
  accessibilityLabel,
  style,
  hapticFeedback = true,
}) => {
  const { color, radii, isDark, shadows } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const backgroundColor = (() => {
    if (variant === 'plain') return 'transparent';
    if (variant === 'solid') return color.primary;
    return isDark ? '#1E2A33' : color.primary + '18';
  })();

  const triggerHaptic = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(0.8, { duration: 100 });
    if (hapticFeedback) {
      runOnJS(triggerHaptic)();
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          {
            width: Math.max(size, 48),
            height: Math.max(size, 48),
            borderRadius: radii.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor,
            opacity: disabled ? 0.5 : 1,
            ...(variant === 'solid' ? shadows.md : shadows.sm),
          } as ViewStyle,
          style,
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {/* icon should adapt to tint if it supports color prop */}
        {icon}
      </Pressable>
    </Animated.View>
  );
};

export default IconButton;
