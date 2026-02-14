
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

interface DuetPlayerProps {
  originalVideoUrl: string;
  userVideoUrl?: string;
  layout: 'side' | 'top-bottom';
  isRecording?: boolean;
  onVideoEnd?: () => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  sideLayout: {
    flexDirection: 'row',
  },
  topBottomLayout: {
    flexDirection: 'column',
  },
  videoContainer: {
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  sideVideo: {
    width: width / 2,
    height: height,
  },
  topBottomVideo: {
    width: width,
    height: height / 2,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default function DuetPlayer({
  originalVideoUrl,
  userVideoUrl,
  layout,
  isRecording = false,
  onVideoEnd,
}: DuetPlayerProps) {
  console.log('DuetPlayer rendering:', { originalVideoUrl, userVideoUrl, layout, isRecording });

  // Video players
  const originalPlayer = useVideoPlayer(originalVideoUrl, (player) => {
    player.loop = true;
    player.play();
  });

  const userPlayer = useVideoPlayer(userVideoUrl || '', (player) => {
    if (userVideoUrl) {
      player.loop = false;
      player.play();
    }
  });

  // Handle video end for user video (for stitch mode)
  useEffect(() => {
    if (!userPlayer || !userVideoUrl) return;

    const subscription = userPlayer.addListener('playingChange', (event) => {
      if (!event.isPlaying && userPlayer.currentTime >= userPlayer.duration - 0.1) {
        console.log('User video ended');
        if (onVideoEnd) {
          onVideoEnd();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userPlayer, userVideoUrl, onVideoEnd]);

  // Auto-play original video when recording starts
  useEffect(() => {
    if (isRecording && originalPlayer) {
      console.log('Starting original video playback for recording');
      originalPlayer.play();
    }
  }, [isRecording, originalPlayer]);

  const containerStyle = layout === 'side' ? styles.sideLayout : styles.topBottomLayout;
  const videoContainerStyle = layout === 'side' ? styles.sideVideo : styles.topBottomVideo;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Original Video */}
      <View style={[styles.videoContainer, videoContainerStyle]}>
        <VideoView
          player={originalPlayer}
          style={styles.video}
          nativeControls={false}
          contentFit="cover"
        />
      </View>

      {/* User Video (if provided) */}
      {userVideoUrl && (
        <View style={[styles.videoContainer, videoContainerStyle]}>
          <VideoView
            player={userPlayer}
            style={styles.video}
            nativeControls={false}
            contentFit="cover"
          />
        </View>
      )}

      {/* Recording placeholder (camera view will overlay this) */}
      {!userVideoUrl && isRecording && (
        <View style={[styles.videoContainer, videoContainerStyle, { backgroundColor: colors.dark }]} />
      )}
    </View>
  );
}
