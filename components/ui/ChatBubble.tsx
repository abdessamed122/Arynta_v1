/**
 * ChatBubble
 * - Aligns left for assistant/system, right for user
 * - Applies distinct color for user bubble using primary color
 * - Timestamp optional and formatted externally when string provided
 * - Pending flag appends ellipsis for streaming effect placeholder
 */
import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, { FadeInRight, FadeInLeft, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export interface ChatBubbleProps {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp?: string | Date;
  pending?: boolean;
  maxWidthPercent?: number; // relative width constraint
  style?: ViewStyle | ViewStyle[];
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  text,
  timestamp,
  pending,
  maxWidthPercent = 0.78,
  style,
}) => {
  const { color, spacing, radii, scaleFont, isDark } = useTheme();

  const isUser = role === 'user';
  const alignStyle: ViewStyle = {
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    maxWidth: `${Math.round(maxWidthPercent * 100)}%` as any,
  };

  let bubbleColor = color.surfaceAlt;
  if (isUser) bubbleColor = color.primary;
  else if (isDark) bubbleColor = '#1E2A33';
  const textColor = isUser ? '#FFFFFF' : color.text;

  const entering = isUser ? FadeInRight.springify().damping(16) : FadeInLeft.springify().damping(16);
  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.duration(160)}
      style={[{ marginBottom: spacing.sm }, alignStyle, style]}
    >      
      <View
        style={{
          backgroundColor: bubbleColor,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.lg,
          borderTopRightRadius: isUser ? radii.sm : radii.lg,
          borderTopLeftRadius: isUser ? radii.lg : radii.sm,
        }}
      >
        <Text
          style={{
            color: textColor,
            fontSize: scaleFont(16),
            lineHeight: 20,
          }}
        >
          {text}
          {pending && ' …'}
        </Text>
      </View>
      {timestamp && (
        <Text
          style={{
            color: color.textAlt,
            fontSize: scaleFont(12),
            marginTop: 4,
          }}
        >
          {typeof timestamp === 'string' ? timestamp : timestamp.toLocaleTimeString()}
        </Text>
      )}
    </Animated.View>
  );
};

export default ChatBubble;
