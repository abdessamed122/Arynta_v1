import axios, { AxiosProgressEvent } from 'axios';
import Constants from 'expo-constants';
// Using legacy interface temporarily to keep downloadAsync without refactor
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { ConversationRequest, ConversationResponse } from '@/types/api';

class ConversationService {
  private readonly baseURL: string;
  private readonly apiToken: string;
  private readonly conversationPath: string;

  constructor() {
    const extra = (Constants as any).expoConfig?.extra || {};
    // Resolution precedence: explicit env (EXPO_PUBLIC_API_BASE_URL) > extra.apiBaseUrl > default localhost
    const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
    this.baseURL = envBase || extra.apiBaseUrl || 'http://192.168.43.20:8000';
    this.apiToken = process.env.EXPO_PUBLIC_API_TOKEN || extra.apiToken || '';
    const envConv = process.env.EXPO_PUBLIC_CONVERSATION_PATH || extra.conversationPath;
    // Ensure leading slash
    const rawPath = envConv || '';
    this.conversationPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  }

  async uploadConversation(
    request: ConversationRequest,
    onProgress?: (progress: number) => void
  ): Promise<ConversationResponse> {
    try {
      const formData = new FormData();

      // Normalize file for web vs native
      let filePart: any = request.file as any;
      if (filePart && typeof filePart === 'object') {
        // Expo Camera / FileSystem often provides { uri, mimeType/name }
        if (filePart.uri && !filePart.name) {
          const guessedName = filePart.uri.split('/').pop() || `recording_${Date.now()}.wav`;
          const type = filePart.type || filePart.mimeType || 'audio/wav';
          filePart = { uri: filePart.uri, name: guessedName, type };
        }
      }

      formData.append('file', filePart);
      formData.append('lang', request.lang || 'en');
      formData.append('target_lang', request.target_lang || 'en');

  const response = await axios.post<ConversationResponse>(`${this.baseURL}${this.conversationPath}`, formData, {
        headers: {
          // Let axios set the boundary automatically
          ...(this.apiToken && { 'Authorization': `Bearer ${this.apiToken}` }),
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(Math.round(progress));
          }
        },
        timeout: 45000,
      });

      return response.data;
    } catch (error: any) {
      // Provide richer diagnostics to the UI / logs
      let detail = 'Upload failed';
      if (error?.response) {
        detail += ` (status ${error.response.status})`;
      } else if (error?.message) {
        detail += `: ${error.message}`;
      }
      console.error('[ConversationService] Upload error', {
        baseURL: this.baseURL,
        code: error?.code,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      if (error?.code === 'ECONNREFUSED') {
        detail = `Cannot reach backend at ${this.baseURL}. Is it running & reachable from device?`;
      } else if (error?.message === 'Network Error') {
        detail = `Network Error contacting ${this.baseURL}. Check LAN IP, tunnel, or firewall.`;
      }
      throw new Error(detail);
    }
  }

  async checkAudioReady(audioUrl: string): Promise<boolean> {
    try {
      const baseFullUrl = audioUrl.startsWith('http') 
        ? audioUrl 
        : `${this.baseURL}${audioUrl.startsWith('/') ? '' : this.conversationPath + '/'}${audioUrl}`;
      // Append cache-busting query to avoid receiving an older cached audio
      const fullUrl = `${baseFullUrl}${baseFullUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;

      const response = await axios.head(fullUrl, {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(this.apiToken && { 'Authorization': `Bearer ${this.apiToken}` }),
        },
      });

      return response.status === 200;
    } catch {
      return false; // treat any failure as not-ready
    }
  }

  private async headAudio(audioUrl: string): Promise<{ ok: boolean; size?: number; lastModified?: string; url: string; etag?: string }> {
    try {
      const baseFullUrl = audioUrl.startsWith('http') 
        ? audioUrl 
        : `${this.baseURL}${audioUrl.startsWith('/') ? '' : this.conversationPath + '/'}${audioUrl}`;
      const fullUrl = `${baseFullUrl}${baseFullUrl.includes('?') ? '&' : '?'}cb=${Date.now()}&rnd=${Math.random().toString(36).slice(2,8)}`;
      const response = await axios.head(fullUrl, {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(this.apiToken && { 'Authorization': `Bearer ${this.apiToken}` }),
        },
      });
      const sizeHeader = response.headers['content-length'] || response.headers['Content-Length'];
      const lastModified = response.headers['last-modified'] || response.headers['Last-Modified'];
      const etag = response.headers['etag'] || response.headers['ETag'];
      const size = sizeHeader ? parseInt(sizeHeader, 10) : undefined;
      return { ok: response.status === 200, size, lastModified, url: fullUrl, etag };
    } catch {
      return { ok: false, url: audioUrl };
    }
  }

  async downloadAudio(audioUrl: string): Promise<string> {
    try {
      const fullUrl = audioUrl.startsWith('http') 
        ? audioUrl 
        : `${this.baseURL}${audioUrl.startsWith('/') ? '' : this.conversationPath + '/'}${audioUrl}`;

      const downloadUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}cb=${Date.now()}`;

      // On web, prefer streaming the remote URL directly (avoids FileSystem limitations)
      if (Platform.OS === 'web') {
        return downloadUrl;
      }

  const filename = audioUrl.split('/').pop() || `audio_${Date.now()}.mp3`;
  const cacheDir: string = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const localUri = `${cacheDir}${filename}`;

  // Using downloadAsync for native; acceptable despite deprecation in current SDK
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri, {
        headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
          ...(this.apiToken && { 'Authorization': `Bearer ${this.apiToken}` }),
        },
      });

      return downloadResult.uri;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  async pollForAudio(
    audioUrl: string,
    onProgress?: (status: string, progress: number) => void,
    timeout: number = 60000
  ): Promise<string> {
    const startTime = Date.now();
    const pollInterval = parseInt((Constants.expoConfig?.extra as any)?.audioPollIntervalMs || process.env.EXPO_PUBLIC_AUDIO_POLL_INTERVAL_MS || '2000', 10);
    const effectiveTimeout = parseInt((Constants.expoConfig?.extra as any)?.audioTimeoutMs || process.env.EXPO_PUBLIC_AUDIO_TIMEOUT_MS || String(timeout), 10);
    const gracePeriodMs = 8000; // after this we allow fallback download even if metadata unchanged

    // Capture initial metadata to detect changes (size / lastModified / etag)
    let initialMeta = await this.headAudio(audioUrl);
    let lastMeta = initialMeta;
  let changeDetectedAt: number | null = null;
  let stableConfirmation = false; // one confirmation after change
  let stableSizeCount = 0; // count consecutive identical size observations after first change
  const requiredStableSizeRepeats = 2; // require N identical sizes before download

    return new Promise((resolve, reject) => {
      const poll = async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= effectiveTimeout) {
          // Before giving up, attempt a direct GET in case HEAD was blocked by server
          try {
            // Final optimistic check before failing
            const headOk = await this.checkAudioReady(audioUrl);
            if (headOk) {
              onProgress?.('downloading', 95);
              const localPath = await this.downloadAudio(audioUrl);
              onProgress?.('ready', 100);
              resolve(localPath);
              return;
            }
          } catch { /* ignore and proceed to timeout */ }
          reject(new Error('Audio polling timeout'));
          return;
        }

        const progress = Math.min((elapsed / effectiveTimeout) * 100, 95);
        onProgress?.('polling', progress);

        try {
          const meta = await this.headAudio(audioUrl);
          lastMeta = meta.ok ? meta : lastMeta;

          let consideredChanged = false;
          if (meta.ok) {
            const sizeChanged = meta.size !== undefined && initialMeta.size !== undefined && meta.size !== initialMeta.size;
            const modChanged = meta.lastModified && initialMeta.lastModified && meta.lastModified !== initialMeta.lastModified;
            const etagChanged = meta.etag && initialMeta.etag && meta.etag !== initialMeta.etag;
            // If initial had no size but now we have size, treat as change
            const newSizeAppeared = initialMeta.size === undefined && meta.size !== undefined;
            const newModAppeared = initialMeta.lastModified === undefined && meta.lastModified !== undefined;
            const newEtagAppeared = initialMeta.etag === undefined && meta.etag !== undefined;

            consideredChanged = sizeChanged || modChanged || etagChanged || newSizeAppeared || newModAppeared || newEtagAppeared;

            if (consideredChanged && changeDetectedAt == null) {
              changeDetectedAt = Date.now();
              // update initialMeta reference baseline so we can confirm stability next poll
              initialMeta = meta;
              onProgress?.('polling', progress); // status unchanged but note internal state
              setTimeout(poll, pollInterval); // wait one more cycle to confirm stable
              return;
            }

            if (changeDetectedAt != null) {
              if (meta.size && initialMeta.size && meta.size === initialMeta.size) {
                stableSizeCount += 1;
              } else {
                // size fluctuated again; reset counter
                stableSizeCount = 0;
              }
              if (!stableConfirmation && stableSizeCount >= requiredStableSizeRepeats) {
                stableConfirmation = true;
              }
            }

            const allowFallback = elapsed > gracePeriodMs;

            if (stableConfirmation || (allowFallback && meta.ok)) {
              try {
                onProgress?.('downloading', 95);
                const localPath = await this.downloadAudio(audioUrl);
                onProgress?.('ready', 100);
                resolve(localPath);
                return;
              } catch (downloadErr) {
                console.warn('Download failed, attempting direct playback fallback:', downloadErr);
                const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${this.baseURL}${audioUrl}`;
                onProgress?.('ready', 100);
                resolve(fullUrl);
                return;
              }
            }
          }
          setTimeout(poll, pollInterval);
        } catch (e) {
          setTimeout(poll, pollInterval);
        }
      };

      poll();
    });
  }
}

export const conversationService = new ConversationService();