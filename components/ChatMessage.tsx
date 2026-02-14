
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import type { Message } from '@/hooks/useMessages';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

export default function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const content = message.content;
  const timestamp = format(new Date(message.createdAt), 'HH:mm');
  const isRead = message.isRead;

  const bubbleStyle = isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble;
  const textStyle = isCurrentUser ? styles.currentUserText : styles.otherUserText;
  const containerStyle = isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer;

  return (
    <View style={[styles.messageContainer, containerStyle]}>
      <View style={[styles.bubble, bubbleStyle]}>
        <Text style={textStyle}>
          {content}
        </Text>
        
        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {timestamp}
          </Text>
          
          {isCurrentUser && isRead && (
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={14}
              color={colors.turquoise}
              style={styles.readIcon}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  currentUserBubble: {
    backgroundColor: colors.purple,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#222',
    borderBottomLeftRadius: 4,
  },
  currentUserText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 20,
  },
  otherUserText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  readIcon: {
    marginLeft: 4,
  },
});
