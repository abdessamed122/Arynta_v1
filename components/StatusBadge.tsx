import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react-native';

interface StatusBadgeProps {
  status: 'idle' | 'processing' | 'polling' | 'ready' | 'error' | 'timeout';
  message?: string;
}

export default function StatusBadge({ status, message }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'ready':
        return {
          icon: <CheckCircle size={16} color="#34C759" />,
          text: message || 'Ready to play',
          backgroundColor: '#E8F5E8',
          textColor: '#34C759',
        };
      case 'processing':
      case 'polling':
        return {
          icon: <Loader2 size={16} color="#007AFF" />,
          text: message || 'Processing...',
          backgroundColor: '#E3F2FD',
          textColor: '#007AFF',
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} color="#FF3B30" />,
          text: message || 'Error occurred',
          backgroundColor: '#FFEBEE',
          textColor: '#FF3B30',
        };
      case 'timeout':
        return {
          icon: <Clock size={16} color="#FF9500" />,
          text: message || 'Timed out',
          backgroundColor: '#FFF3E0',
          textColor: '#FF9500',
        };
      default:
        return {
          icon: <Clock size={16} color="#8E8E93" />,
          text: message || 'Not ready',
          backgroundColor: '#F5F5F5',
          textColor: '#8E8E93',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      {config.icon}
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});