/**
 * Card component
 * - Composed from Surface level=1 to ensure consistent elevation
 * - Optional title/subtitle/footer sections
 * - Padded by default; can disable for custom layouts
 */
import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import Surface from './Surface';

interface CardProps extends ViewProps {
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  footer,
  children,
  style,
  padded = true,
  ...rest
}) => {
  const { color, spacing, typography, scaleFont } = useTheme();
  return (
    <Surface level={1} padding={padded ? 'md' : 'none'} style={style} {...rest}>
      {(title || subtitle) && (
        <View style={{ marginBottom: children ? spacing.sm : 0 }}>
          {title && (
            <Text
              style={{
                color: color.text,
                fontSize: scaleFont(16),
                fontWeight: typography.weight.semibold as any,
              }}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={{
                color: color.textAlt,
                fontSize: scaleFont(14),
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
      {footer && <View style={{ marginTop: spacing.sm }}>{footer}</View>}
    </Surface>
  );
};

export default Card;
