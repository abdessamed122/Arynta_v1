import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, PanResponder, GestureResponderEvent } from 'react-native';
import { Play, Pause, Loader as Loader2 } from 'lucide-react-native';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import WebAudioPlayer from './WebAudioPlayer';
import { useTheme } from '@/theme/ThemeProvider';

interface AudioPlayerProps {
  audioUri?: string;
  onError?: (error: Error) => void;
  autoPlay?: boolean;
}

export default function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const { audioUri, onError, autoPlay } = props;
  const { color, spacing, radii, scaleFont } = useTheme();
  const player = useAudioPlayer();
  const attemptedAutoPlayRef = React.useRef(false);
  const [effectiveUri, setEffectiveUri] = React.useState<string | undefined>();
  const [seeking, setSeeking] = React.useState(false);
  const [seekPosition, setSeekPosition] = React.useState<number | null>(null);

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
        handleSeek(evt);
      },
      onPanResponderMove: (evt) => handleSeek(evt),
      onPanResponderRelease: () => {
        if (seekPosition != null) {
          player.seek(seekPosition);
        }
        setSeeking(false);
        setSeekPosition(null);
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

  const renderNative = () => {
    if (!effectiveUri) {
      return (
        <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radii.lg, padding: spacing.md, marginVertical: spacing.sm, alignItems: 'center' }}>
          <Text style={{ color: color.textAlt, fontSize: scaleFont(14), fontStyle: 'italic' }}>No audio available</Text>
        </View>
      );
    }
    return (
      <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radii.lg, padding: spacing.md, marginVertical: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          accessibilityRole="button"
            accessibilityLabel={player.isPlaying ? 'Pause audio' : 'Play audio'}
          disabled={!player.isLoaded || player.isBuffering}
          onPress={player.togglePlayPause}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: color.primary + '22',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.md,
            opacity: !player.isLoaded ? 0.5 : 1,
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {player.isBuffering && <Loader2 size={24} color={color.primary} />}
          {!player.isBuffering && player.isPlaying && <Pause size={24} color={color.primary} />}
          {!player.isBuffering && !player.isPlaying && <Play size={24} color={color.primary} />}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View
            ref={progressBarRef}
            {...panResponder.panHandlers}
            style={{
              height: 10,
              backgroundColor: color.border,
              borderRadius: 5,
              justifyContent: 'center',
              marginBottom: spacing.xs,
            }}
          >
            <View
              style={{
                height: 10,
                width: `${progressPct}%`,
                backgroundColor: color.primary,
                borderRadius: 5,
              }}
            />
            {seeking && (
              <View
                style={{
                  position: 'absolute',
                  left: `${progressPct}%`,
                  top: 5,
                  transform: [{ translateX: -8 }, { translateY: -8 }],
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: color.primary,
                }}
              />
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: scaleFont(12), color: color.textAlt }}>{formatTime(activePosition)}</Text>
            <Text style={{ fontSize: scaleFont(12), color: color.textAlt }}>{formatTime(player.duration)}</Text>
          </View>
        </View>
      </View>
    </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radii.lg, padding: spacing.md, marginVertical: spacing.sm }}>
        <WebAudioPlayer src={audioUri} autoPlay={autoPlay} onError={(e) => onError?.(e)} />
      </View>
    );
  }

  return renderNative();
}

const styles = StyleSheet.create({});