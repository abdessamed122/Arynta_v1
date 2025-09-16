import React from 'react';
import { View, TouchableOpacity, Text, Animated, Platform } from 'react-native';
import { Mic, Square, Pause } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function RecordButton({ isRecording, onPress, disabled }: RecordButtonProps) {
  const { color, spacing, radii, typography, scaleFont, shadows } = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isRecording) {
      // Pulse animation for recording state
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Subtle rotation animation
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );

      pulse.start();
      rotate.start();
      
      return () => {
        pulse.stop();
        rotate.stop();
      };
    } else {
      // Reset animations when not recording
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 3,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const buttonSize = 100;
  const innerButtonSize = 80;

  return (
    <View style={{ alignItems: 'center', marginVertical: spacing['3xl'] }}>
      {/* Outer glow effect when recording */}
      {isRecording && (
        <Animated.View
          style={{
            position: 'absolute',
            width: buttonSize + 40,
            height: buttonSize + 40,
            borderRadius: (buttonSize + 40) / 2,
            backgroundColor: color.danger + '20',
            transform: [{ scale: pulseAnim }],
          }}
        />
      )}
      
      {/* Main button container */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { rotate: rotation },
          ],
        }}
      >
        <View
          style={{
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            ...shadows.lg,
          }}
        >
          <LinearGradient
            colors={
              isRecording
                ? ['#EF4444', '#DC2626']
                : disabled
                ? [color.border, color.surfaceAlt]
                : ['#6366F1', '#4338CA']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              style={{
                width: innerButtonSize,
                height: innerButtonSize,
                borderRadius: innerButtonSize / 2,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
              }}
              onPress={onPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={disabled}
              accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isRecording ? (
                <Square size={32} color="white" fill="white" />
              ) : (
                <Mic size={32} color="white" />
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Button label */}
      <Text
        style={{
          marginTop: spacing.lg,
          fontSize: scaleFont(typography.size.lg),
          fontWeight: typography.weight.semibold as any,
          color: isRecording ? color.danger : color.text,
          textAlign: 'center',
        }}
      >
        {isRecording ? 'Tap to Stop' : 'Tap to Record'}
      </Text>
      
      {/* Subtitle hint */}
      <Text
        style={{
          marginTop: spacing.xs,
          fontSize: scaleFont(typography.size.sm),
          color: color.textAlt,
          textAlign: 'center',
        }}
      >
        {isRecording ? 'Recording in progress...' : 'Hold and speak clearly'}
      </Text>
    </View>
  );
}