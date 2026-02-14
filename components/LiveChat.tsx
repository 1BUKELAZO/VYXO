
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import type { LiveChatMessage } from '@/hooks/useLiveStream';

interface LiveChatProps {
  messages: LiveChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatList: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chatMessage: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  chatUsername: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  chatText: {
    color: colors.text,
    fontSize: 14,
    flexShrink: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default function LiveChat({ messages, onSendMessage, isLoading }: LiveChatProps) {
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim()) return;
    
    const content = messageText.trim();
    setMessageText('');
    onSendMessage(content);
  };

  const renderMessage = ({ item }: { item: LiveChatMessage }) => {
    const usernameText = item.username;
    const messageContent = item.message;

    return (
      <View style={styles.chatMessage}>
        <Text style={styles.chatUsername}>{usernameText}: </Text>
        <Text style={styles.chatText}>{messageContent}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Say something..."
          placeholderTextColor={colors.textSecondary}
          value={messageText}
          onChangeText={setMessageText}
          maxLength={200}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || isLoading}
        >
          <IconSymbol
            ios_icon_name="paperplane.fill"
            android_material_icon_name="send"
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
