import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { RecorderState } from '@/types/api';

export function useRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    duration: 0,
    hasPermission: false,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  // Use ReturnType<typeof setInterval> for cross-platform compatibility
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkPermissions();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web permissions are handled differently
        setState(prev => ({ ...prev, hasPermission: true }));
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      setState(prev => ({ ...prev, hasPermission: status === 'granted' }));
    } catch (error) {
      console.error('Permission check failed:', error);
      setState(prev => ({ ...prev, hasPermission: false }));
    }
  };

  const startRecording = async (): Promise<void> => {
    try {
      if (Platform.OS !== 'web') {
        // Configure audio session for recording with maximum output loudness and no ducking
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
          });
        } catch (e) {
          console.warn('Failed to set recording audio mode', e);
        }
      }

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      recordingRef.current = recording;
      setState(prev => ({ ...prev, isRecording: true, duration: 0 }));

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<string | undefined> => {
    try {
      if (!recordingRef.current) return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
  const uri = recordingRef.current.getURI() ?? undefined;
      
      recordingRef.current = null;
  setState(prev => ({ ...prev, isRecording: false, uri }));

      // Restore playback-focused audio mode (especially important on iOS)
      if (Platform.OS !== 'web') {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
          });
        } catch (e) {
          console.warn('Failed to restore playback audio mode', e);
        }
      }

  return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  };

  const resetRecorder = () => {
    setState(prev => ({ ...prev, duration: 0, uri: undefined }));
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecorder,
    requestPermission: checkPermissions,
  };
}