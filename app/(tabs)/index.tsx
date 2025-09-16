import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { FileText, Upload, Sparkles, Mic2, Volume2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useRecorder } from '@/hooks/useRecorder';
import { conversationService } from '@/services/ConversationService';
import { storageService } from '@/services/StorageService';
import RecordButton from '@/components/RecordButton';
import ProgressBar from '@/components/ProgressBar';
import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecordScreen() {
  const router = useRouter();
  const recorder = useRecorder();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { color, spacing, typography, scaleFont, radii, shadows } = useTheme();

  const recordingScale = useSharedValue(1);
  const recordingOpacity = useSharedValue(1);

  const animatedRecordingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingScale.value }],
    opacity: recordingOpacity.value,
  }));

  React.useEffect(() => {
    if (recorder.isRecording) {
      recordingScale.value = withSpring(1.05, { damping: 10 });
      recordingOpacity.value = withTiming(0.9, { duration: 300 });
    } else {
      recordingScale.value = withSpring(1, { damping: 10 });
      recordingOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [recorder.isRecording]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <Header 
        title="Voice Assistant" 
        subtitle="Language Learning Companion"
        gradient
      />
      
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing['4xl'],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={{ 
            alignItems: 'center', 
            marginTop: spacing['3xl'],
            marginBottom: spacing['4xl'],
          }}
        >
          <View
            style={{
              backgroundColor: color.primary + '15',
              padding: spacing.lg,
              borderRadius: radii['3xl'],
              marginBottom: spacing.lg,
            }}
          >
            <Sparkles size={32} color={color.primary} />
          </View>
          
          <Text
            style={{
              fontSize: scaleFont(typography.size['3xl']),
              fontWeight: typography.weight.bold as any,
              color: color.text,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Start Conversation
          </Text>
          
          <Text
            style={{
              fontSize: scaleFont(typography.size.lg),
              color: color.textAlt,
              textAlign: 'center',
              lineHeight: scaleFont(typography.size.lg) * 1.4,
              paddingHorizontal: spacing.xl,
            }}
          >
            Record your voice or upload an audio file to practice with our AI language assistant
          </Text>
        </Animated.View>

        {/* Recording Section */}
        <Animated.View 
          entering={FadeInUp.delay(400).duration(600)}
          style={animatedRecordingStyle}
        >
          {!recorder.hasPermission ? (
            <Card style={{ marginBottom: spacing.xl }}>
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <View
                  style={{
                    backgroundColor: color.warning + '20',
                    padding: spacing.lg,
                    borderRadius: radii.round,
                    marginBottom: spacing.lg,
                  }}
                >
                  <Mic2 size={32} color={color.warning} />
                </View>
                
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.lg),
                    fontWeight: typography.weight.semibold as any,
                    color: color.text,
                    textAlign: 'center',
                    marginBottom: spacing.sm,
                  }}
                >
                  Microphone Access Required
                </Text>
                
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.md),
                    color: color.textAlt,
                    textAlign: 'center',
                    marginBottom: spacing.xl,
                    lineHeight: scaleFont(typography.size.md) * 1.4,
                  }}
                >
                  We need access to your microphone to record audio for language learning
                </Text>
                
                <Button 
                  onPress={recorder.requestPermission}
                  size="lg"
                  style={{ minWidth: 200 }}
                >
                  Grant Permission
                </Button>
              </View>
            </Card>
          ) : (
            <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
              <RecordButton
                isRecording={recorder.isRecording}
                onPress={handleRecord}
                disabled={isUploading}
              />
              
              {recorder.duration > 0 && (
                <Animated.View
                  entering={FadeInUp.duration(300)}
                  style={{
                    backgroundColor: color.surfaceAlt,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    borderRadius: radii.xl,
                    marginTop: spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    ...shadows.sm,
                  }}
                >
                  <Volume2 size={20} color={color.primary} style={{ marginRight: spacing.sm }} />
                  <Text
                    style={{
                      fontSize: scaleFont(typography.size.lg),
                      fontWeight: typography.weight.semibold as any,
                      color: color.text,
                    }}
                  >
                    Duration: {formatDuration(recorder.duration)}
                  </Text>
                </Animated.View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View 
          entering={FadeInUp.delay(600).duration(600)}
          style={{ marginBottom: spacing.xl }}
        >
          {recorder.uri && (
            <Button
              onPress={handleSend}
              disabled={isUploading}
              loading={isUploading}
              size="lg"
              iconLeft={<Upload size={20} color="white" />}
              style={{ 
                marginBottom: spacing.md,
                ...shadows.md,
              }}
            >
              {isUploading ? 'Uploading...' : 'Send Recording'}
            </Button>
          )}

          <Button
            variant="outline"
            onPress={handleFilePicker}
            disabled={isUploading}
            size="lg"
            iconLeft={<FileText size={20} color={color.primary} />}
            style={{ ...shadows.sm }}
          >
            Select Audio File
          </Button>
        </Animated.View>

        {/* Upload Progress */}
        {isUploading && (
          <Animated.View 
            entering={FadeInUp.duration(300)}
            style={{ marginBottom: spacing.xl }}
          >
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.lg),
                    fontWeight: typography.weight.semibold as any,
                    color: color.text,
                    marginBottom: spacing.lg,
                  }}
                >
                  Processing Your Audio
                </Text>
                
                <ProgressBar
                  progress={uploadProgress}
                  label="Analyzing speech patterns..."
                  color={color.primary}
                />
                
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.sm),
                    color: color.textAlt,
                    textAlign: 'center',
                    marginTop: spacing.md,
                  }}
                >
                  This may take a few moments
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Features Section */}
        <Animated.View 
          entering={FadeInUp.delay(800).duration(600)}
          style={{ marginTop: spacing.xl }}
        >
          <Text
            style={{
              fontSize: scaleFont(typography.size.xl),
              fontWeight: typography.weight.bold as any,
              color: color.text,
              marginBottom: spacing.lg,
              textAlign: 'center',
            }}
          >
            How it works
          </Text>
          
          {[
            {
              icon: <Mic2 size={24} color={color.primary} />,
              title: 'Record or Upload',
              description: 'Speak naturally or select an audio file'
            },
            {
              icon: <Sparkles size={24} color={color.accent} />,
              title: 'AI Analysis',
              description: 'Our AI analyzes your speech and provides feedback'
            },
            {
              icon: <Volume2 size={24} color={color.success} />,
              title: 'Interactive Response',
              description: 'Get audio responses and conversation practice'
            },
          ].map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInUp.delay(1000 + index * 100).duration(400)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: color.surfaceAlt,
                padding: spacing.lg,
                borderRadius: radii.lg,
                marginBottom: spacing.md,
                ...shadows.xs,
              }}
            >
              <View
                style={{
                  backgroundColor: color.surface,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  marginRight: spacing.lg,
                }}
              >
                {feature.icon}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.lg),
                    fontWeight: typography.weight.semibold as any,
                    color: color.text,
                    marginBottom: spacing.xs,
                  }}
                >
                  {feature.title}
                </Text>
                
                <Text
                  style={{
                    fontSize: scaleFont(typography.size.md),
                    color: color.textAlt,
                    lineHeight: scaleFont(typography.size.md) * 1.4,
                  }}
                >
                  {feature.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
      
      <Toast />
    </SafeAreaView>
  );
}