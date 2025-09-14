import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { FileText, Upload } from 'lucide-react-native';

import { useRecorder } from '@/hooks/useRecorder';
import { conversationService } from '@/services/ConversationService';
import { storageService } from '@/services/StorageService';
import RecordButton from '@/components/RecordButton';
import ProgressBar from '@/components/ProgressBar';

export default function RecordScreen() {
  const router = useRouter();
  const recorder = useRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecord = async () => {
    try {
      if (!recorder.hasPermission) {
        await recorder.requestPermission();
        return;
      }

      if (recorder.isRecording) {
        await recorder.stopRecording();
      } else {
        recorder.resetRecorder();
        await recorder.startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Recording Error', 'Failed to start/stop recording. Please try again.');
    }
  };

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        await uploadAudio(file.uri, file.name || 'selected_audio.wav');
      }
    } catch (error) {
      console.error('File picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'File Selection Error',
        text2: 'Failed to select audio file.',
      });
    }
  };

  const uploadAudio = async (uri: string, filename: string) => {
    if (!uri) {
      Alert.alert('No Audio', 'Please record or select an audio file first.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create file object for upload
      let file: File | Blob;
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        file = await response.blob();
      } else {
        // For mobile, we'll use FormData with the URI
        file = {
          uri,
          type: 'audio/wav',
          name: filename,
        } as any;
      }

      const response = await conversationService.uploadConversation(
        { file, lang: 'en', target_lang: 'en' },
        setUploadProgress
      );

      if (response.success) {
        // Save to local storage
        const conversation = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          transcript: response.transcript,
          reply_text: response.reply_text,
          server_audio_url: response.reply_audio_url,
        };

        await storageService.saveConversation(conversation);

        Toast.show({
          type: 'success',
          text1: 'Upload Successful',
          text2: 'Processing your conversation...',
        });

        // Navigate to conversation screen
        router.push({
          pathname: '/conversation',
          params: {
            conversationId: conversation.id,
            transcript: response.transcript,
            replyText: response.reply_text,
            audioUrl: response.reply_audio_url,
          },
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorTitle = 'Upload Failed';
      let errorMessage = 'Please try again.';
      
      if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
        errorTitle = 'Connection Error';
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (error.response?.status === 404) {
        errorTitle = 'Server Error';
        errorMessage = 'API endpoint not found. Please check server configuration.';
      } else if (error.response?.status >= 500) {
        errorTitle = 'Server Error';
        errorMessage = 'Server is experiencing issues. Please try again later.';
      } else if (error.code === 'ECONNREFUSED') {
        errorTitle = 'Connection Refused';
        errorMessage = 'Server is not responding. Please start your backend server.';
      }
      
      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessage,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSend = () => {
    if (recorder.uri) {
      uploadAudio(recorder.uri, `recording_${Date.now()}.wav`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Language Learning Assistant</Text>
          <Text style={styles.subtitle}>
            Record your voice or select an audio file to start a conversation
          </Text>
        </View>

        <View style={styles.recordSection}>
          {!recorder.hasPermission ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>
                Microphone access is required to record audio.
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={recorder.requestPermission}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <RecordButton
                isRecording={recorder.isRecording}
                onPress={handleRecord}
                disabled={isUploading}
              />
              
              {recorder.duration > 0 && (
                <View style={styles.durationContainer}>
                  <Text style={styles.duration}>
                    Duration: {formatDuration(recorder.duration)}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.actionSection}>
          {recorder.uri && (
            <TouchableOpacity
              style={[styles.actionButton, styles.sendButton]}
              onPress={handleSend}
              disabled={isUploading}
            >
              <Upload size={20} color="white" />
              <Text style={styles.actionButtonText}>
                {isUploading ? 'Uploading...' : 'Send Recording'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.fileButton]}
            onPress={handleFilePicker}
            disabled={isUploading}
          >
            <FileText size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, { color: '#007AFF' }]}>
              Select Audio File
            </Text>
          </TouchableOpacity>
        </View>

        {isUploading && (
          <View style={styles.progressSection}>
            <ProgressBar
              progress={uploadProgress}
              label="Uploading audio..."
              color="#007AFF"
            />
          </View>
        )}
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  recordSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#FF9500',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  durationContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  fileButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  progressSection: {
    marginTop: 20,
  },
});