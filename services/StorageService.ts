import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoredConversation } from '@/types/api';

const CONVERSATIONS_KEY = 'stored_conversations';

class StorageService {
  async getConversations(): Promise<StoredConversation[]> {
    try {
      const data = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get conversations:', error);
      return [];
    }
  }

  async saveConversation(conversation: StoredConversation): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const updated = [conversation, ...conversations].slice(0, 50); // Keep only last 50
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      const conversations = await this.getConversations();
      const filtered = conversations.filter(c => c.id !== id);
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }

  async clearAllConversations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONVERSATIONS_KEY);
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();