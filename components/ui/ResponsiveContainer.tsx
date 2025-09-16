/**
 * Responsive Container Component
 * - Adapts to different screen sizes (phone, tablet, desktop)
 * - Provides appropriate padding and max-width constraints
 * - Centers content on larger screens
 */
import React from 'react';
import { View, Dimensions, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  maxWidth?: number;
  fullWidth?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  maxWidth,
  fullWidth = false,
}) => {
  const { spacing } = useTheme();

  // Determine device type based on screen width
  const isTablet = screenWidth >= 768;
  const isDesktop = screenWidth >= 1024;

  // Default max width based on device type
  const defaultMaxWidth = isDesktop ? 1200 : isTablet ? 800 : screenWidth;
  const effectiveMaxWidth = maxWidth || defaultMaxWidth;

  // Responsive padding
  const horizontalPadding = isDesktop 
    ? spacing['6xl'] 
    : isTablet 
      ? spacing['4xl'] 
      : spacing.lg;

  const containerStyle: ViewStyle = {
    width: fullWidth ? '100%' : Math.min(screenWidth, effectiveMaxWidth),
    paddingHorizontal: horizontalPadding,
    alignSelf: 'center',
  };

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
};

export default ResponsiveContainer;