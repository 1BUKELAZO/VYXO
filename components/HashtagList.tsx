
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';

interface HashtagListProps {
  text: string;
  style?: TextStyle;
  hashtagStyle?: TextStyle;
  numberOfLines?: number;
}

/**
 * Component that renders text with clickable hashtags
 * Hashtags are styled in purple and navigate to hashtag page when tapped
 */
export default function HashtagList({ 
  text, 
  style, 
  hashtagStyle,
  numberOfLines 
}: HashtagListProps) {
  // Split text by hashtags
  const HASHTAG_REGEX = /#[a-zA-Z0-9_]+/g;
  const parts: string[] = [];
  const hashtags: string[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add hashtag
    hashtags.push(match[0]);
    parts.push(match[0]);
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  const handleHashtagPress = (hashtag: string) => {
    // Remove # symbol and navigate
    const hashtagName = hashtag.substring(1);
    console.log('User tapped hashtag:', hashtagName);
    router.push(`/hashtag/${hashtagName}`);
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isHashtag = part.startsWith('#');
        
        if (isHashtag) {
          return (
            <Text
              key={index}
              style={[styles.hashtag, hashtagStyle]}
              onPress={() => handleHashtagPress(part)}
            >
              {part}
            </Text>
          );
        }
        
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  hashtag: {
    color: colors.purple,
    fontWeight: '700',
  },
});
