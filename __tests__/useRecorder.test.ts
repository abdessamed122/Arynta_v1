import { renderHook, act } from '@testing-library/react-native';
import { useRecorder } from '@/hooks/useRecorder';

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
    Recording: {
      createAsync: jest.fn(),
    },
    RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16_BIT: 'pcm_16_bit',
    RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM: 'pcm',
    RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM: 'linearpcm',
    RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH: 'high',
  },
}));

import { Audio } from 'expo-av';

describe('useRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(result.current.uri).toBeUndefined();
    expect(result.current.hasPermission).toBe(false);
  });

  it('should request permissions on initialization', () => {
    renderHook(() => useRecorder());
    expect(Audio.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('should update permission state when granted', async () => {
    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    const { result } = renderHook(() => useRecorder());

    // Wait for permissions to be checked
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasPermission).toBe(true);
  });

  it('should start recording when permission is granted', async () => {
    const mockRecording = {
      stopAndUnloadAsync: jest.fn(),
      getURI: jest.fn().mockReturnValue('file://recording.wav'),
    };

    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Audio.Recording.createAsync as jest.Mock).mockResolvedValue({
      recording: mockRecording,
    });

    const { result } = renderHook(() => useRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(Audio.Recording.createAsync).toHaveBeenCalled();
  });

  it('should stop recording and return URI', async () => {
    const mockRecording = {
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file://recording.wav'),
    };

    (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Audio.Recording.createAsync as jest.Mock).mockResolvedValue({
      recording: mockRecording,
    });

    const { result } = renderHook(() => useRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    let uri: string | undefined;
    await act(async () => {
      uri = await result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(uri).toBe('file://recording.wav');
    expect(mockRecording.stopAndUnloadAsync).toHaveBeenCalled();
  });

  it('should reset recorder state', () => {
    const { result } = renderHook(() => useRecorder());

    act(() => {
      result.current.resetRecorder();
    });

    expect(result.current.duration).toBe(0);
    expect(result.current.uri).toBeUndefined();
  });
});