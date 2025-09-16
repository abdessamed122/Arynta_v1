import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
  height?: number;
}

export default function ProgressBar({ 
  progress, 
  label = 'Progress', 
  color,
  showPercentage = true,
  height = 8,
}: ProgressBarProps) {
  const { color: themeColor, spacing, typography, scaleFont, radii } = useTheme();
  const progressValue = useSharedValue(0);
  const activeColor = color || themeColor.primary;

  React.useEffect(() => {
    progressValue.value = withTiming(
      Math.max(0, Math.min(100, progress)),
      {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      }
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  return (
    <View style={{ marginVertical: spacing.sm }}>
      {/* Label and percentage row */}
      <View 
        style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}
      >
        {label && (
          <Text
            style={{
              fontSize: scaleFont(typography.size.sm),
              fontWeight: typography.weight.medium as any,
              color: themeColor.text,
            }}
          >
            {label}
          </Text>
        )}
        
        {showPercentage && (
          <Text
            style={{
              fontSize: scaleFont(typography.size.sm),
              fontWeight: typography.weight.semibold as any,
              color: themeColor.textAlt,
            }}
          >
            {Math.round(progress)}%
          </Text>
        )}
      </View>

      {/* Progress bar */}
      <View
        style={{
          height,
          backgroundColor: themeColor.border,
          borderRadius: height / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: activeColor,
              borderRadius: height / 2,
              minWidth: height, // Ensures we always see something when progress > 0
            },
            animatedStyle,
          ]}
        />
        
        {/* Shimmer effect for active progress */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              height: '100%',
              width: height * 2,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: height / 2,
              transform: [{ translateX: -height * 2 }],
            },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
}