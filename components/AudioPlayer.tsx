import React from 'react';
import { View, Text, TouchableOpacity, Platform, PanResponder, GestureResponderEvent } from 'react-native';
import { Play, Pause, Loader as Loader2, RotateCcw, Volume2 } from 'lucide-react-native';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import WebAudioPlayer from './WebAudioPlayer';
import { useTheme } from '@/theme/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';

interface AudioPlayerProps {
  audioUri?: string;
  onError?: (error: Error) => void;
  autoPlay?: boolean;
}

export default function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const { audioUri, onError, autoPlay } = props;
  const { color, spacing, radii, scaleFont, typography, shadows } = useTheme();
  const player = useAudioPlayer();
  const attemptedAutoPlayRef = React.useRef(false);
  const [effectiveUri, setEffectiveUri] = React.useState<string | undefined>();
  const [seeking, setSeeking] = React.useState(false);
  const [seekPosition, setSeekPosition] = React.useState<number | null>(null);

  const buttonScale = useSharedValue(1);
  const progressScale = useSharedValue(1);

  React.useEffect(() => {
    if (!audioUri) {
      setEffectiveUri(undefined);
      return;
    }
    const stamp = Date.now();
    const sep = audioUri.includes('?') ? '&' : '?';
    setEffectiveUri(`${audioUri}${sep}v=${stamp}`);
  }, [audioUri]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!effectiveUri) {
        player.cleanup();
        return;
      }
      attemptedAutoPlayRef.current = false;
      try {
        await player.loadAudio(effectiveUri);
        if (!cancelled && autoPlay && !attemptedAutoPlayRef.current) {
          attemptedAutoPlayRef.current = true;
          try { await player.play(); } catch (e: any) { onError?.(e); }
        }
      } catch (e: any) {
        onError?.(e);
      }
    };
    run();
    return () => { cancelled = true; player.cleanup(); };
  }, [effectiveUri]);

  React.useEffect(() => {
    if (autoPlay && player.isLoaded && !player.isPlaying && !attemptedAutoPlayRef.current) {
      attemptedAutoPlayRef.current = true;
      player.play().catch(e => onError?.(e));
    }
  }, [autoPlay, player.isLoaded]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activePosition = seeking && seekPosition != null ? seekPosition : player.position;
  const progressPct = player.duration > 0 ? (activePosition / player.duration) * 100 : 0;

  const progressBarRef = React.useRef<View | null>(null);
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setSeeking(true);
        progressScale.value = withSpring(1.1);
        handleSeek(evt);
      },
      onPanResponderMove: (evt) => handleSeek(evt),
      onPanResponderRelease: () => {
        if (seekPosition != null) {
          player.seek(seekPosition);
        }
        setSeeking(false);
        setSeekPosition(null);
        progressScale.value = withSpring(1);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const handleSeek = (evt: GestureResponderEvent) => {
    if (!progressBarRef.current || player.duration <= 0) return;
    progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
      const touchX = evt.nativeEvent.pageX - pageX;
      const clamped = Math.max(0, Math.min(width, touchX));
      const ratio = clamped / width;
      setSeekPosition(ratio * player.duration);
    });
  };

  const handlePlayPause = () => {
    buttonScale.value = withSpring(0.9, { duration: 100 }, () => {
      buttonScale.value = withSpring(1);
    });
    player.togglePlayPause();
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progressScale.value }],
  }));

  const renderNative = () => {
    if (!effectiveUri) {
      return (
        <Animated.View 
          entering={FadeIn.duration(400)}
          style={{ 
            backgroundColor: color.surfaceAlt, 
            borderRadius: radii.xl, 
            padding: spacing.lg, 
            alignItems: 'center',
            ...shadows.sm,
          }}
        >
          <View
            style={{
              backgroundColor: color.border + '40',
              padding: spacing.lg,
              borderRadius: radii.round,
              marginBottom: spacing.md,
            }}
          >
            <Volume2 size={24} color={color.textAlt} />
          </View>
          <Text 
            style={{ 
              color: color.textAlt, 
              fontSize: scaleFont(typography.size.md),
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            No audio available
          </Text>
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        entering={SlideInDown.duration(600)}
        style={{
          backgroundColor: color.surface,
          borderRadius: radii.xl,
          overflow: 'hidden',
          ...shadows.md,
        }}
      >
        <LinearGradient
          colors={[color.surface, color.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            padding: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Play/Pause Button */}
            <Animated.View style={animatedButtonStyle}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={player.isPlaying ? 'Pause audio' : 'Play audio'}
                disabled={!player.isLoaded || player.isBuffering}
                onPress={handlePlayPause}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.lg,
                  opacity: !player.isLoaded ? 0.5 : 1,
                  ...shadows.md,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LinearGradient
                  colors={[color.primary, color.primaryHover]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {player.isBuffering && (
                    <Animated.View
                      style={{
                        transform: [{ rotate: '0deg' }],
                      }}
                    >
                      <Loader2 size={28} color="white" />
                    </Animated.View>
                  )}
                  {!player.isBuffering && player.isPlaying && <Pause size={28} color="white" />}
                  {!player.isBuffering && !player.isPlaying && <Play size={28} color="white" />}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Progress Section */}
            <View style={{ flex: 1 }}>
              {/* Progress Bar */}
              <Animated.View
                ref={progressBarRef}
                {...panResponder.panHandlers}
                style={[
                  {
                    height: 8,
                    backgroundColor: color.border,
                    borderRadius: 4,
                    justifyContent: 'center',
                    marginBottom: spacing.sm,
                    overflow: 'hidden',
                  },
                  animatedProgressStyle,
                ]}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    colors={[color.primary, color.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: '100%',
                      width: '100%',
                    }}
                  />
                </View>
                
                {/* Progress thumb when seeking */}
                {seeking && (
                  <View
                    style={{
                      position: 'absolute',
                      left: `${progressPct}%`,
                      top: 4,
                      transform: [{ translateX: -8 }, { translateY: -8 }],
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: color.primary,
                      ...shadows.md,
                    }}
                  />
                )}
              </Animated.View>

              {/* Time Display */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text 
                  style={{ 
                    fontSize: scaleFont(typography.size.sm), 
                    color: color.text,
                    fontWeight: typography.weight.medium as any,
                  }}
                >
                  {formatTime(activePosition)}
                </Text>
                <Text 
                  style={{ 
                    fontSize: scaleFont(typography.size.sm), 
                    color: color.textAlt,
                    fontWeight: typography.weight.medium as any,
                  }}
                >
                  {formatTime(player.duration)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={{ 
        backgroundColor: color.surface, 
        borderRadius: radii.xl, 
        overflow: 'hidden',
        ...shadows.md,
      }}>
        <WebAudioPlayer 
          src={audioUri} 
          autoPlay={autoPlay} 
          onError={(e) => onError?.(e)} 
        />
      </View>
    );
  }

  return renderNative();
}