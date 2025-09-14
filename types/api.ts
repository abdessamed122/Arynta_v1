export interface ConversationRequest {
  file: File | Blob;
  lang?: string;
  target_lang?: string;
}

export interface ConversationResponse {
  success: boolean;
  transcript: string;
  reply_text: string;
  reply_audio_url: string;
  timings?: {
    stt_time?: number;
    llm_time?: number;
    tts_time?: number;
  };
}

export interface StoredConversation {
  id: string;
  timestamp: number;
  transcript: string;
  reply_text: string;
  local_audio_path?: string;
  server_audio_url: string;
}

export interface AudioPlayerState {
  isLoaded: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  isBuffering: boolean;
}

export interface RecorderState {
  isRecording: boolean;
  duration: number;
  uri?: string;
  hasPermission: boolean;
}

export interface PollingStatus {
  status: 'idle' | 'polling' | 'ready' | 'error' | 'timeout';
  progress: number;
  localPath?: string;
}