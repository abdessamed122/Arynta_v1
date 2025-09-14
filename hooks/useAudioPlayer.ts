import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { AudioPlayerState } from '@/types/api';

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isLoaded: false,
    isPlaying: false,
    position: 0,
    duration: 0,
    isBuffering: false,
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const positionRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const loadTokenRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    if (positionRef.current) {
      clearInterval(positionRef.current);
      positionRef.current = null;
    }
    if (soundRef.current) {
      try { soundRef.current.setOnPlaybackStatusUpdate(null); } catch {}
      try { await soundRef.current.stopAsync(); } catch {}
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  };

  const loadAudio = async (uri: string): Promise<void> => {
    const loadId = ++loadTokenRef.current;
    try {
      await cleanup();
      if (!mountedRef.current) return;
      setState(prev => ({ ...prev, isBuffering: true, isLoaded: false, isPlaying: false, position: 0, duration: 0 }));

      // Ensure proper playback audio mode on iOS before loading the sound
      if (Platform.OS === 'ios') {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
          });
        } catch (e) { console.warn('Failed to set playback audio mode', e); }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, volume: 1.0 }
      );

      if (loadId !== loadTokenRef.current) {
        // A newer load started; dispose this sound
        try { sound.setOnPlaybackStatusUpdate(null); } catch {}
        try { await sound.unloadAsync(); } catch {}
        return;
      }

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    } catch (error) {
      console.error('Failed to load audio:', error);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isBuffering: false }));
      }
      throw error;
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (!mountedRef.current) return;
    if (!status?.isLoaded) return;
    // Guard against race where soundRef got cleaned already
    setState(prev => ({
      ...prev,
      isLoaded: true,
      isPlaying: status.isPlaying,
      position: status.positionMillis || 0,
      duration: status.durationMillis || 0,
      isBuffering: status.isBuffering || false,
    }));
  };

  const play = async (): Promise<void> => {
    if (!soundRef.current) return;
    try { await soundRef.current.playAsync(); } catch (e) { console.warn('play failed', e); }
  };

  const pause = async (): Promise<void> => {
    if (!soundRef.current) return;
    try { await soundRef.current.pauseAsync(); } catch (e) { console.warn('pause failed', e); }
  };

  const stop = async (): Promise<void> => {
    if (!soundRef.current) return;
    try { await soundRef.current.stopAsync(); } catch (e) { console.warn('stop failed', e); }
  };

  const seek = async (position: number): Promise<void> => {
    if (!soundRef.current) return;
    try { await soundRef.current.setPositionAsync(position); } catch (e) { console.warn('seek failed', e); }
  };

  const togglePlayPause = async (): Promise<void> => {
    if (state.isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  return {
    ...state,
    loadAudio,
    play,
    pause,
    stop,
    seek,
    togglePlayPause,
    cleanup,
  };
}