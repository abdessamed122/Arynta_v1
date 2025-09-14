import React, { useRef, useEffect, useState } from 'react';

interface WebAudioPlayerProps {
  src?: string;
  autoPlay?: boolean;
  onReady?: (durationMs: number) => void;
  onProgress?: (positionMs: number, durationMs: number) => void;
  onError?: (e: Error) => void;
}

export default function WebAudioPlayer({ src, autoPlay, onReady, onProgress, onError }: WebAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | undefined>();

  useEffect(() => {
    if (!src) {
      setLoadedSrc(undefined);
      return;
    }
    // Force fresh load by appending version param
    const sep = src.includes('?') ? '&' : '?';
    const withCb = `${src}${sep}wv=${Date.now()}`;
    setLoadedSrc(withCb);
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleLoaded = () => {
      try { onReady?.(el.duration * 1000); } catch {}
      if (autoPlay) { el.play().catch(err => onError?.(err)); }
    };
    const handleTime = () => {
      if (!el.duration || isNaN(el.duration)) return;
      onProgress?.(el.currentTime * 1000, el.duration * 1000);
    };
    const handleError = () => {
      const mediaError = (el as any).error;
      const msg = mediaError?.message || 'Web audio playback error';
      onError?.(new Error(msg));
    };

    el.addEventListener('loadedmetadata', handleLoaded);
    el.addEventListener('timeupdate', handleTime);
    el.addEventListener('error', handleError);

    return () => {
      el.removeEventListener('loadedmetadata', handleLoaded);
      el.removeEventListener('timeupdate', handleTime);
      el.removeEventListener('error', handleError);
    };
  }, [loadedSrc, autoPlay]);

  if (!loadedSrc) {
    return <div style={{padding:8,fontStyle:'italic',color:'#666'}}>No audio</div>;
  }

  return (
    <audio
      ref={audioRef}
      src={loadedSrc}
      controls
      preload="auto"
      style={{ width: '100%' }}
    />
  );
}
