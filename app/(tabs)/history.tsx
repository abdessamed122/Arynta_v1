import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Play, Clock, MessageSquare, Volume2 } from 'lucide-react-native';
import Animated, { FadeInDown, SlideInRight } from 'react-native-reanimated';

import { storageService } from '@/services/StorageService';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { StoredConversation } from '@/types/api';
import { useTheme } from '@/theme/ThemeProvider';
import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer();
  const { color, spacing, typography, scaleFont, radii, shadows } = useTheme();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const stored = await storageService.getConversations();
      setConversations(stored);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (conversation: StoredConversation) => {
    try {
      if (playingId === conversation.id) {
        // Stop current audio
        await audioPlayer.cleanup();
        setPlayingId(null);
      } else {
        // Start new audio
        if (conversation.local_audio_path) {
          await audioPlayer.cleanup();
          await audioPlayer.loadAudio(conversation.local_audio_path);
          await audioPlayer.play();
          setPlayingId(conversation.id);
        } else {
          Alert.alert('Audio Not Available', 'The audio file for this conversation is not cached locally.');
        }
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      Alert.alert('Playback Error', 'Failed to play audio.');
    }
  };

  const deleteConversation = (conversation: StoredConversation) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.deleteConversation(conversation.id);
              setConversations(prev => prev.filter(c => c.id !== conversation.id));
              if (playingId === conversation.id) {
                await audioPlayer.cleanup();
                setPlayingId(null);
              }
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete conversation.');
            }
          },
        },
      ]
    );
  };

  const clearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all conversations? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.clearAllConversations();
              setConversations([]);
              await audioPlayer.cleanup();
              setPlayingId(null);
            } catch (error) {
              console.error('Clear all failed:', error);
              Alert.alert('Error', 'Failed to clear history.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today at ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return 'Yesterday at ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const renderConversation = ({ item, index }: { item: StoredConversation; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={{ marginBottom: spacing.lg }}
    >
      <Card style={{ ...shadows.sm }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                backgroundColor: color.primary + '20',
                padding: spacing.sm,
                borderRadius: radii.lg,
                marginRight: spacing.sm,
              }}
            >
              <Clock size={16} color={color.primary} />
            </View>
            <Text
              style={{
                fontSize: scaleFont(typography.size.sm),
                color: color.textAlt,
                flex: 1,
              }}
            >
              {formatDate(item.timestamp)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={{
              padding: spacing.sm,
              borderRadius: radii.lg,
              backgroundColor: color.dangerBg,
            }}
            onPress={() => deleteConversation(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={18} color={color.danger} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={{ marginBottom: spacing.md }}>
          {/* User message */}
          <View
            style={{
              backgroundColor: color.surfaceAlt,
              padding: spacing.md,
              borderRadius: radii.lg,
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <MessageSquare size={16} color={color.textAlt} />
              <Text
                style={{
                  fontSize: scaleFont(typography.size.sm),
                  fontWeight: typography.weight.semibold as any,
                  color: color.textAlt,
                  marginLeft: spacing.xs,
                }}
              >
                You said:
              </Text>
            </View>
            <Text
              style={{
                fontSize: scaleFont(typography.size.md),
                color: color.text,
                lineHeight: scaleFont(typography.size.md) * 1.4,
              }}
              numberOfLines={3}
            >
              {item.transcript}
            </Text>
          </View>

          {/* Assistant message */}
          <View
            style={{
              backgroundColor: color.primary + '10',
              padding: spacing.md,
              borderRadius: radii.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Volume2 size={16} color={color.primary} />
              <Text
                style={{
                  fontSize: scaleFont(typography.size.sm),
                  fontWeight: typography.weight.semibold as any,
                  color: color.primary,
                  marginLeft: spacing.xs,
                }}
              >
                Assistant replied:
              </Text>
            </View>
            <Text
              style={{
                fontSize: scaleFont(typography.size.md),
                color: color.text,
                lineHeight: scaleFont(typography.size.md) * 1.4,
              }}
              numberOfLines={3}
            >
              {item.reply_text}
            </Text>
          </View>
        </View>

        {/* Play button */}
        {item.local_audio_path && (
          <Button
            variant="outline"
            onPress={() => playAudio(item)}
            iconLeft={<Play size={20} color={color.primary} />}
          >
            {playingId === item.id ? 'Stop Audio' : 'Play Audio'}
          </Button>
        )}
      </Card>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <Header title="History" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: scaleFont(typography.size.lg),
              color: color.textAlt,
            }}
          >
            Loading conversations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (conversations.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <Header title="History" />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing['4xl'],
          }}
        >
          <View
            style={{
              backgroundColor: color.surfaceAlt,
              padding: spacing['4xl'],
              borderRadius: radii['3xl'],
              marginBottom: spacing.xl,
            }}
          >
            <MessageSquare size={48} color={color.textAlt} />
          </View>
          
          <Text
            style={{
              fontSize: scaleFont(typography.size['2xl']),
              fontWeight: typography.weight.bold as any,
              color: color.text,
              marginBottom: spacing.sm,
              textAlign: 'center',
            }}
          >
            No Conversations Yet
          </Text>
          
          <Text
            style={{
              fontSize: scaleFont(typography.size.lg),
              color: color.textAlt,
              textAlign: 'center',
              lineHeight: scaleFont(typography.size.lg) * 1.4,
            }}
          >
            Start recording to see your conversation history here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Header title="History" subtitle={`${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`} />
      
      <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {/* Clear all button */}
        <View style={{ paddingVertical: spacing.lg }}>
          <Button
            variant="soft"
            onPress={clearAllHistory}
            iconLeft={<Trash2 size={20} color={color.danger} />}
            style={{ backgroundColor: color.dangerBg }}
          >
            <Text style={{ color: color.danger }}>Clear All History</Text>
          </Button>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}