
import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface VideoThumbnailProps {
  thumbnailUrl: string;
  duration: number; // Duration in seconds
  width?: number;
  height?: number;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.dark,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

// Helper to resolve image sources
function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function VideoThumbnail({
  thumbnailUrl,
  duration,
  width = 120,
  height = 160,
}: VideoThumbnailProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      const secsPadded = String(secs).padStart(2, '0');
      return `${mins}:${secsPadded}`;
    }
    
    return `0:${String(secs).padStart(2, '0')}`;
  };

  const durationDisplay = formatDuration(duration);

  return (
    <View style={[styles.container, { width, height }]}>
      <Image
        source={resolveImageSource(thumbnailUrl)}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>{durationDisplay}</Text>
      </View>
    </View>
  );
}
