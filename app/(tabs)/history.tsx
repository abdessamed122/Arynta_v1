import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Play, Clock } from 'lucide-react-native';

import { storageService } from '@/services/StorageService';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { StoredConversation } from '@/types/api';

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer();

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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderConversation = ({ item }: { item: StoredConversation }) => (
    <View style={styles.conversationCard}>
      <View style={styles.conversationHeader}>
        <View style={styles.timestampContainer}>
          <Clock size={16} color="#8E8E93" />
          <Text style={styles.timestamp}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteConversation(item)}
        >
          <Trash2 size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.messageBlock}>
          <Text style={styles.messageLabel}>You said:</Text>
          <Text style={styles.messageText} numberOfLines={2}>
            {item.transcript}
          </Text>
        </View>

        <View style={styles.messageBlock}>
          <Text style={styles.messageLabel}>Assistant replied:</Text>
          <Text style={styles.messageText} numberOfLines={2}>
            {item.reply_text}
          </Text>
        </View>
      </View>

      {item.local_audio_path && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => playAudio(item)}
        >
          <Play size={20} color="#007AFF" />
          <Text style={styles.playButtonText}>
            {playingId === item.id ? 'Stop Audio' : 'Play Audio'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (conversations.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start recording to see your conversation history here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversation History</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearAllHistory}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 20,
  },
  conversationCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 4,
  },
  conversationContent: {
    marginBottom: 12,
  },
  messageBlock: {
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 8,
  },
  playButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});