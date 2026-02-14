
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import VideoEditor from '@/components/VideoEditor';
import { colors } from '@/styles/commonStyles';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
});

export default function VideoEditorScreen() {
  const params = useLocalSearchParams();
  const videoUri = params.videoUri as string;

  if (!videoUri) {
    console.error('No video URI provided to VideoEditor');
    router.back();
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <VideoEditor
        videoUri={videoUri}
        onComplete={() => {
          console.log('Video upload complete, navigating to home');
          router.replace({
            pathname: '/(tabs)/(home)',
            params: { refresh: 'true' },
          });
        }}
      />
    </View>
  );
}
