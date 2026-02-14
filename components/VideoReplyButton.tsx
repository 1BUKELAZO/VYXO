
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface VideoReplyButtonProps {
  videoId: string;
  videoAuthorUsername: string;
}

export default function VideoReplyButton({ videoId, videoAuthorUsername }: VideoReplyButtonProps) {
  const handleRecordReply = () => {
    console.log('[VideoReplyButton] Opening camera for reply to video:', videoId);
    
    // Navigate to camera screen with reply parameters
    router.push({
      pathname: '/camera',
      params: {
        replyToVideoId: videoId,
        replyToUsername: videoAuthorUsername,
        minDuration: 3,
        maxDuration: 15,
      },
    });
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleRecordReply}>
      <View style={styles.iconContainer}>
        <IconSymbol
          ios_icon_name="video.fill"
          android_material_icon_name="videocam"
          size={20}
          color={colors.text}
        />
      </View>
      <Text style={styles.buttonText}>Reply with Video</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 15,
    marginHorizontal: 15,
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
