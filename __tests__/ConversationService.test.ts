import { conversationService } from '@/services/ConversationService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file://cache/',
  downloadAsync: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiBaseUrl: 'http://localhost:3000',
      apiToken: 'test-token',
    },
  },
}));

import * as FileSystem from 'expo-file-system';

describe('ConversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadConversation', () => {
    it('should upload conversation successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          transcript: 'Hello world',
          reply_text: 'Hi there!',
          reply_audio_url: '/static/tts_outputs/test.mp3',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const mockFile = new Blob(['audio data'], { type: 'audio/wav' });
      const result = await conversationService.uploadConversation({
        file: mockFile,
        lang: 'en',
        target_lang: 'es',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/conversation',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'multipart/form-data',
            'Authorization': 'Bearer test-token',
          }),
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should call progress callback during upload', async () => {
      const mockResponse = {
        data: { success: true, transcript: '', reply_text: '', reply_audio_url: '' },
      };

      const progressCallback = jest.fn();
      mockedAxios.post.mockImplementation((url, data, config) => {
        // Simulate progress
        if (config?.onUploadProgress) {
          config.onUploadProgress({ loaded: 50, total: 100 } as any);
        }
        return Promise.resolve(mockResponse);
      });

      const mockFile = new Blob(['audio data'], { type: 'audio/wav' });
      await conversationService.uploadConversation(
        { file: mockFile },
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalledWith(50);
    });
  });

  describe('checkAudioReady', () => {
    it('should return true when audio is ready', async () => {
      mockedAxios.head.mockResolvedValue({ status: 200 });

      const isReady = await conversationService.checkAudioReady('/static/test.mp3');

      expect(isReady).toBe(true);
      expect(mockedAxios.head).toHaveBeenCalledWith(
        'http://localhost:3000/static/test.mp3',
        expect.objectContaining({
          timeout: 5000,
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should return false when audio is not ready', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Not found'));

      const isReady = await conversationService.checkAudioReady('/static/test.mp3');

      expect(isReady).toBe(false);
    });
  });

  describe('downloadAudio', () => {
    it('should download audio successfully', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        uri: 'file://cache/test.mp3',
      });

      const localUri = await conversationService.downloadAudio('/static/test.mp3');

      expect(localUri).toBe('file://cache/test.mp3');
      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        'http://localhost:3000/static/test.mp3',
        'file://cache/test.mp3',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('pollForAudio', () => {
    jest.useFakeTimers();

    it('should poll until audio is ready', async () => {
      mockedAxios.head
        .mockRejectedValueOnce(new Error('Not ready'))
        .mockRejectedValueOnce(new Error('Not ready'))
        .mockResolvedValueOnce({ status: 200 });

      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        uri: 'file://cache/test.mp3',
      });

      const progressCallback = jest.fn();
      const pollPromise = conversationService.pollForAudio(
        '/static/test.mp3',
        progressCallback,
        10000
      );

      // Advance timers to trigger polling
      jest.advanceTimersByTime(6000);
      
      const localUri = await pollPromise;

      expect(localUri).toBe('file://cache/test.mp3');
      expect(progressCallback).toHaveBeenCalledWith('polling', expect.any(Number));
      expect(progressCallback).toHaveBeenCalledWith('ready', 100);
    });

    it('should timeout after specified duration', async () => {
      mockedAxios.head.mockRejectedValue(new Error('Not ready'));

      const pollPromise = conversationService.pollForAudio(
        '/static/test.mp3',
        undefined,
        5000
      );

      jest.advanceTimersByTime(6000);

      await expect(pollPromise).rejects.toThrow('Audio polling timeout');
    });

    jest.useRealTimers();
  });
});