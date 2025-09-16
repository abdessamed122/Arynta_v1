import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Volume2, MessageCircle, Sparkles } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';

import { conversationService } from '@/services/ConversationService';
import { storageService } from '@/services/StorageService';
import AudioPlayer from '@/components/AudioPlayer';
import ProgressBar from '@/components/ProgressBar';
import { PollingStatus } from '@/types/api';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/theme/ThemeProvider';
import { ChatBubble } from '@/components/ui/ChatBubble';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Header from '@/components/ui/Header';

export default function ConversationScreen() {
  const { color, spacing, typography, scaleFont, radii, shadows } = useTheme();
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
        return 'Processing your audio...';
      case 'ready':
        return 'Audio is ready to play!';
      case 'error':
        return 'Failed to process audio';
      case 'timeout':
        return 'Audio processing timed out';
      default:
        return 'Preparing audio response...';
    }
  };

  const getStatusIcon = () => {
    switch (pollingStatus.status) {
      case 'polling':
        return <Sparkles size={24} color={color.accent} />;
      case 'ready':
        return <Volume2 size={24} color={color.success} />;
      case 'error':
      case 'timeout':
        return <MessageCircle size={24} color={color.danger} />;
      default:
        return <Sparkles size={24} color={color.textAlt} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Header 
        title="Conversation" 
        subtitle="AI Language Assistant"
        showBack
        onBackPress={() => {
          // You can implement navigation back logic here
        }}
      />
      
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing['3xl'],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Chat Section */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={{ marginBottom: spacing.xl }}
        >
          <View
            style={{
              backgroundColor: color.surfaceAlt,
              borderRadius: radii.xl,
              padding: spacing.lg,
              ...shadows.sm,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <View
                style={{
                  backgroundColor: color.primary + '20',
                  padding: spacing.sm,
                  borderRadius: radii.lg,
                  marginRight: spacing.sm,
                }}
              >
                <MessageCircle size={20} color={color.primary} />
              </View>
              <Text
                style={{
                  fontSize: scaleFont(typography.size.lg),
                  fontWeight: typography.weight.semibold as any,
                  color: color.text,
                }}
              >
                Conversation
              </Text>
            </View>
            
            <ChatBubble 
              role="user" 
              text={transcript || 'No transcript available'} 
              showAvatar={false}
            />
            <ChatBubble 
              role="assistant" 
              text={replyText || 'No reply available'} 
              showAvatar={false}
            />
          </View>
        </Animated.View>

        {/* Audio Player Section */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(600)}
          style={{ marginBottom: spacing.xl }}
        >
          <Card
            style={{
              ...shadows.md,
              backgroundColor: color.surface,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              {getStatusIcon()}
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.lg),
                    fontWeight: typography.weight.semibold as any,
                    color: color.text,
                  }}
                >
                  Audio Response
                </Text>
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.sm),
                    color: color.textAlt,
                    marginTop: spacing.xs,
                  }}
                >
                  {getStatusMessage()}
                </Text>
              </View>
            </View>

            {pollingStatus.status === 'polling' && (
              <View style={{ marginBottom: spacing.lg }}>
                <ProgressBar
                  progress={pollingStatus.progress}
                  label="Processing audio..."
                  color={color.accent}
                  height={6}
                />
              </View>
            )}

            {(pollingStatus.status === 'error' || pollingStatus.status === 'timeout') && (
              <View style={{ marginBottom: spacing.lg }}>
                <Button 
                  variant="outline" 
                  onPress={retryPolling}
                  style={{ ...shadows.sm }}
                >
                  Retry Processing
                </Button>
              </View>
            )}

            <AudioPlayer
              key={audioVersion}
              audioUri={pollingStatus.localPath}
              autoPlay={pollingStatus.status === 'ready'}
              onError={(error) => {
                console.error('Audio player error:', error);
                setPollingStatus({ status: 'error', progress: 0 });
              }}
            />
          </Card>
        </Animated.View>

        {/* How it works section */}
        <Animated.View 
          entering={SlideInRight.delay(600).duration(500)}
          style={{
            backgroundColor: color.infoBg,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}
        >
          <Text
            style={{
              fontSize: scaleFont(typography.size.lg),
              fontWeight: typography.weight.semibold as any,
              color: color.info,
              marginBottom: spacing.md,
            }}
          >
            💡 How it works
          </Text>
          {[
            'Your audio is analyzed by our AI language assistant',
            'We process the speech and generate a thoughtful response',
            'Processing typically takes 10-30 seconds',
            'You can retry if processing takes longer than expected',
          ].map((line, index) => (
            <Animated.View
              key={line}
              entering={FadeInUp.delay(800 + index * 100).duration(300)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: scaleFont(typography.size.md),
                  color: color.info,
                  fontWeight: typography.weight.semibold as any,
                  marginRight: spacing.sm,
                }}
              >
                {index + 1}.
              </Text>
              <Text
                style={{
                  fontSize: scaleFont(typography.size.md),
                  color: color.text,
                  lineHeight: scaleFont(typography.size.md) * 1.4,
                  flex: 1,
                }}
              >
                {line}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}