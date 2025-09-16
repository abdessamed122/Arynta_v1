/**
 * Modern Header Component
 * - Clean design with title and optional menu/action icons
 * - Supports gradients and blur effects
 * - Responsive design for different screen sizes
 */
import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, Settings, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showSettings?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onSettingsPress?: () => void;
  gradient?: boolean;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  showMenu = false,
  showSettings = false,
  onBackPress,
  onMenuPress,
  onSettingsPress,
  gradient = false,
  transparent = false,
}) => {
  const { color, spacing, typography, scaleFont, radii, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const headerHeight = 56;
  const totalHeight = insets.top + headerHeight;

  const backgroundColor = transparent 
    ? 'transparent' 
    : gradient 
      ? undefined 
      : color.surface;

  const HeaderContent = () => (
    <View
      style={{
        height: headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        justifyContent: 'space-between',
      }}
    >
      {/* Left side */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {showBack && (
          <TouchableOpacity
            onPress={onBackPress}
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.lg,
              backgroundColor: color.surface + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.sm,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color={color.text} />
          </TouchableOpacity>
        )}
        
        {showMenu && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.lg,
              backgroundColor: color.surface + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.sm,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Menu size={24} color={color.text} />
          </TouchableOpacity>
        )}

        {/* Title Section */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: scaleFont(typography.size.xl),
              fontWeight: typography.weight.bold as any,
              color: color.text,
              lineHeight: scaleFont(typography.size.xl) * 1.2,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: scaleFont(typography.size.sm),
                color: color.textAlt,
                marginTop: 2,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Right side */}
      {showSettings && (
        <TouchableOpacity
          onPress={onSettingsPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.lg,
            backgroundColor: color.surface + '20',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Settings size={24} color={color.text} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={transparent ? 'transparent' : color.surface}
        translucent={transparent}
      />
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor,
        }}
      >
        {gradient ? (
          <LinearGradient
            colors={isDark ? ['#1D2939', '#475467'] : ['#6366F1', '#4338CA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: headerHeight }}
          >
            <HeaderContent />
          </LinearGradient>
        ) : (
          <HeaderContent />
        )}
      </View>
    </>
  );
};

export default Header;