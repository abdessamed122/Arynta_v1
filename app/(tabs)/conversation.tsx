import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { conversationService } from '@/services/ConversationService';
import { storageService } from '@/services/StorageService';
import AudioPlayer from '@/components/AudioPlayer';
import ProgressBar from '@/components/ProgressBar';
import { PollingStatus } from '@/types/api';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/theme/ThemeProvider';
import { ChatBubble } from '@/components/ui/ChatBubble';
import Animated, { LinearTransition } from 'react-native-reanimated';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Surface from '@/components/ui/Surface';

export default function ConversationScreen() {
  const { color, spacing, typography, scaleFont } = useTheme();
  const params = useLocalSearchParams();
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({
    status: 'idle',
    progress: 0,
  });
  const [audioVersion, setAudioVersion] = useState(0);
  const [webBlobUrl, setWebBlobUrl] = useState<string | undefined>(undefined);

  const transcript = params.transcript as string;
  const replyText = params.replyText as string;
  const audioUrl = params.audioUrl as string;
  const conversationId = params.conversationId as string;

  useEffect(() => {
    if (!audioUrl) return;
    // Always reset status & version so AudioPlayer remounts for new URL
    setPollingStatus({ status: 'idle', progress: 0 });
    setAudioVersion(v => v + 1); // force remount even before ready
    startPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const startPolling = async () => {
    try {
      setPollingStatus({ status: 'polling', progress: 0 });

      const localPath = await conversationService.pollForAudio(
        audioUrl,
        (status, progress) => {
          setPollingStatus({ status: status as any, progress });
        },
        60000 // 60 second timeout
      );
  const uniquePath = await ensureUniqueAudioPath(localPath);
  logAudioFileInfo(uniquePath).catch(()=>{});

      // Web blob fallback: fetch raw bytes and create object URL to force fresh buffer
      let finalPath = uniquePath;
      // Try blob only if on web; keep original uniquePath as primary
  if (typeof window !== 'undefined' && audioUrl) {
        (async () => {
          try {
            const response = await fetch(`${audioUrl}?cb=${Date.now()}`);
            if (response.ok) {
              const blob = await response.blob();
              if (blob.size > 0) {
                const objUrl = URL.createObjectURL(blob);
                if (webBlobUrl) {
                  try { URL.revokeObjectURL(webBlobUrl); } catch {}
                }
                setWebBlobUrl(objUrl);
                // Do not override finalPath immediately; let user toggle manually in future if needed
                console.log('[AudioDebug] blob prepared size=', blob.size);
              }
            }
          } catch (e) {
            console.warn('[AudioDebug] web blob fetch failed (non-fatal)', e);
          }
        })();
      }

      setPollingStatus({
        status: 'ready',
        progress: 100,
        localPath: finalPath
      });
      setAudioVersion(v => v + 1);

      // Update stored conversation with local audio path
      if (conversationId) {
        const conversations = await storageService.getConversations();
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.local_audio_path = localPath;
          await storageService.saveConversation(conversation);
        }
      }
    } catch (error) {
      console.error('Polling failed:', error);
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      setPollingStatus({ 
        status: isTimeout ? 'timeout' : 'error', 
        progress: 0 
      });
    }
  };

  const retryPolling = () => {
    setPollingStatus({ status: 'idle', progress: 0 });
    startPolling();
  };

  // Force a brand‑new path so expo-av always reloads audio.
  // 1. If remote URL (http/https), download to a uniquely named cache file.
  // 2. If existing local file, copy to a new uniquely named file.
  // 3. Append cacheBust param as a final safeguard.
  const ensureUniqueAudioPath = async (path?: string) => {
    try {
      if (!path) return path;
      const isRemote = path.startsWith('http');
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 9);
      const fileName = `reply_${timestamp}_${random}.mp3`;
      const dest = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}`;

      if (isRemote) {
        // Download fresh copy to unique file
        await FileSystem.downloadAsync(path, dest, {
          headers: { 'Cache-Control': 'no-cache' }
        });
        return addCacheBuster(dest);
      } else if (path.startsWith('file://')) {
        await FileSystem.copyAsync({ from: path, to: dest });
        return addCacheBuster(dest);
      }
      return addCacheBuster(path);
    } catch (e) {
      console.warn('ensureUniqueAudioPath failed, falling back to original path:', e);
      return addCacheBuster(path);
    }
  };

  const addCacheBuster = (uri?: string) => {
    if (!uri) return uri;
    if (uri.includes('cacheBust=')) return uri; // already added
    const sep = uri.includes('?') ? '&' : '?';
    return `${uri}${sep}cacheBust=${Date.now()}`;
  };

  const logAudioFileInfo = async (uri?: string) => {
    try {
      if (!uri?.startsWith('file://')) {
        return;
      }
      const contents = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const binary = (globalThis as any)?.atob ? (globalThis as any).atob(contents) : '';
      const size = binary.length || Math.floor((contents.length * 3) / 4); // approximate size
      console.log('[AudioDebug] file size(bytes)=', size, 'uri=', uri);
    } catch (e) {
      console.warn('[AudioDebug] info failed', e);
    }
  };

  const getStatusMessage = () => {
    switch (pollingStatus.status) {
      case 'polling':
        return 'Checking if audio is ready...';
      case 'ready':
        return 'Audio is ready to play!';
      case 'error':
        return 'Failed to download audio';
      case 'timeout':
        return 'Audio processing timed out';
      default:
        return 'Preparing audio...';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing['3xl'],
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Text
            style={{
              fontSize: scaleFont(24),
              fontWeight: typography.weight.bold as any,
              color: color.text,
            }}
          >
            Conversation
          </Text>
        </View>

        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              fontSize: scaleFont(14),
              fontWeight: typography.weight.semibold as any,
              color: color.textAlt,
              marginBottom: spacing.sm,
              textTransform: 'uppercase',
            }}
          >
            Dialogue
          </Text>
          <Card>
            <Animated.View layout={LinearTransition.duration(180)}>
              <ChatBubble role="user" text={transcript || 'No transcript available'} />
              <ChatBubble role="assistant" text={replyText || 'No reply available'} />
            </Animated.View>
          </Card>
        </View>

        <View style={{ marginBottom: spacing.xl }}>
          <Card title="Audio Response" subtitle={getStatusMessage()}>
            {pollingStatus.status === 'polling' && (
              <ProgressBar
                progress={pollingStatus.progress}
                label="Preparing audio..."
                color={color.primary}
              />
            )}
            {(pollingStatus.status === 'error' || pollingStatus.status === 'timeout') && (
              <Button variant="outline" onPress={retryPolling}>
                Retry
              </Button>
            )}
            <View style={{ marginTop: spacing.md }}>
              <AudioPlayer
                key={audioVersion}
                audioUri={pollingStatus.localPath}
                autoPlay={pollingStatus.status === 'ready'}
                onError={(error) => {
                  console.error('Audio player error:', error);
                  setPollingStatus({ status: 'error', progress: 0 });
                }}
              />
            </View>
          </Card>
        </View>

        <Surface level={0} padding="md" rounded style={{ backgroundColor: color.surfaceAlt, marginBottom: spacing.xl }}>
          <Text
            style={{
              fontSize: scaleFont(16),
              fontWeight: typography.weight.semibold as any,
              color: color.text,
              marginBottom: spacing.xs,
            }}
          >
            How it works
          </Text>
          {[
            'Your audio is processed by our AI language assistant',
            'We check for the audio response every 2 seconds',
            'Processing typically takes 10-30 seconds',
            'If it exceeds 60 seconds you can retry',
          ].map(line => (
            <Text
              key={line}
              style={{
                fontSize: scaleFont(14),
                color: color.textAlt,
                lineHeight: 20,
                marginBottom: 4,
              }}
            >
              • {line}
            </Text>
          ))}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

// Legacy StyleSheet removed: migrated to theme-driven inline styles.
const styles = StyleSheet.create({});