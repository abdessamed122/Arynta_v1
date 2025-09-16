/**
 * ChatBubble
 * - Enhanced with modern design and better animations
 * - Aligns left for assistant/system, right for user
 * - Applies distinct color for user bubble using primary color
 * - Timestamp optional and formatted externally when string provided
 * - Pending flag appends ellipsis for streaming effect placeholder
 * - Added shadows and better typography
 */
import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, { FadeInRight, FadeInLeft, FadeOut, LinearTransition } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, User } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp?: string | Date;
  pending?: boolean;
  maxWidthPercent?: number; // relative width constraint
  style?: ViewStyle | ViewStyle[];
  showAvatar?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  text,
  timestamp,
  pending,
  maxWidthPercent = 0.85,
  style,
  showAvatar = true,
}) => {
  const { color, spacing, radii, scaleFont, typography, shadows, isDark } = useTheme();

  const isUser = role === 'user';
  const alignStyle: ViewStyle = {
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: `${Math.round(maxWidthPercent * 100)}%` as any,
  };

  const bubbleColors = isUser 
    ? [color.primary, color.primaryHover]
    : isDark 
      ? [color.surfaceAlt, color.surface]
      : [color.surfaceAlt, '#F8FAFC'];
      
  const textColor = isUser ? '#FFFFFF' : color.text;
  const entering = isUser ? FadeInRight.springify().damping(16) : FadeInLeft.springify().damping(16);

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.duration(160)}
      style={[{ marginBottom: spacing.lg }, alignStyle, style]}
    >
      <View
        style={{
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
        }}
      >
        {/* Avatar */}
        {showAvatar && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isUser ? color.primary + '20' : color.accent + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginHorizontal: spacing.sm,
              ...shadows.sm,
            }}
          >
            {isUser ? (
              <User size={18} color={color.primary} />
            ) : (
              <Bot size={18} color={color.accent} />
            )}
          </View>
        )}

        {/* Message bubble */}
        <View
          style={{
            flex: 1,
            ...shadows.sm,
          }}
        >
          <LinearGradient
            colors={bubbleColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderRadius: radii.xl,
              borderTopRightRadius: isUser ? radii.sm : radii.xl,
              borderTopLeftRadius: isUser ? radii.xl : radii.sm,
            }}
          >
            <Text
              style={{
                color: textColor,
                fontSize: scaleFont(typography.size.md),
                fontWeight: typography.weight.regular as any,
                lineHeight: scaleFont(typography.size.md) * 1.4,
              }}
            >
              {text}
              {pending && (
                <Text style={{ opacity: 0.7 }}>
                  <Animated.Text
                    entering={FadeInRight.delay(200)}
                    style={{ color: textColor }}
                  >
                    {' '}●●●
                  </Animated.Text>
                </Text>
              )}
            </Text>
          </LinearGradient>

          {/* Timestamp */}
          {timestamp && (
            <Text
              style={{
                color: color.textAlt,
                fontSize: scaleFont(typography.size.xs),
                marginTop: spacing.xs,
                marginHorizontal: spacing.md,
                textAlign: isUser ? 'right' : 'left',
              }}
            >
              {typeof timestamp === 'string' ? timestamp : timestamp.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export default ChatBubble;
