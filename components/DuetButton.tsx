
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useDuets } from '@/hooks/useDuets';

interface DuetButtonProps {
  videoId: string;
  allowDuets: boolean;
  duetsCount?: number;
  onPress?: () => void;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default function DuetButton({ videoId, allowDuets, duetsCount: initialDuetsCount = 0, onPress }: DuetButtonProps) {
  const { getDuetsCount } = useDuets();
  const [duetsCount, setDuetsCount] = useState(initialDuetsCount);

  // Fetch duets count on mount
  useEffect(() => {
    const fetchDuetsCount = async () => {
      try {
        const count = await getDuetsCount(videoId);
        setDuetsCount(count);
      } catch (err) {
        console.error('Failed to fetch duets count:', err);
        // Keep initial count on error
      }
    };

    fetchDuetsCount();
  }, [videoId, getDuetsCount]);

  const handlePress = () => {
    console.log('User tapped Duet button for video:', videoId);
    
    if (!allowDuets) {
      console.log('Duets not allowed for this video');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onPress) {
      onPress();
    } else {
      // Navigate to duet creation screen
      router.push({
        pathname: '/duet/[videoId]',
        params: { videoId },
      });
    }
  };

  const countDisplay = duetsCount > 0 ? (duetsCount >= 1000 ? `${(duetsCount / 1000).toFixed(1)}K` : duetsCount.toString()) : '';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !allowDuets && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={!allowDuets}
        activeOpacity={0.7}
      >
        <IconSymbol
          ios_icon_name="person.2"
          android_material_icon_name="group"
          size={28}
          color={allowDuets ? colors.turquoise : '#888888'}
        />
      </TouchableOpacity>
      {countDisplay && <Text style={styles.count}>{countDisplay}</Text>}
    </View>
  );
}
