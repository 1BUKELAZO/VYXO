
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '@/styles/commonStyles';
import { AdCreative } from '@/hooks/useAds';
import { LinearGradient } from 'expo-linear-gradient';

interface AdCardProps {
  ad: AdCreative & { impressionId?: string };
  onSkip?: () => void;
  onAdClick?: (impressionId: string) => void;
  isFocused: boolean;
}

const { width, height } = Dimensions.get('window');

export default function AdCard({ ad, onSkip, onAdClick, isFocused }: AdCardProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const player = useVideoPlayer(ad.creative_url, (player) => {
    player.loop = true;
    player.muted = false;
  });

  useEffect(() => {
    console.log('AdCard mounted, isFocused:', isFocused);
    if (isFocused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isFocused, player]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAdClick = async () => {
    console.log('Ad clicked, CTA URL:', ad.cta_url);
    if (ad.cta_url) {
      try {
        await Linking.openURL(ad.cta_url);
        if (ad.impressionId && onAdClick) {
          onAdClick(ad.impressionId);
        }
      } catch (err) {
        console.error('Error opening ad URL:', err);
      }
    }
  };

  const handleSkip = () => {
    console.log('Ad skipped');
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <View style={styles.container}>
      {/* Promoted Label */}
      <View style={styles.promotedBadge}>
        <Text style={styles.promotedText}>Promoted</Text>
      </View>

      {/* Video Player */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Bottom Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      >
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>{ad.cta_text}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={handleAdClick}>
            <Text style={styles.ctaButtonText}>{ad.cta_text}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Skip Button */}
      {showSkip ? (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip Ad</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip in {countdown}s</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  promotedBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  promotedText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  ctaContainer: {
    gap: 12,
  },
  ctaText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  ctaButton: {
    backgroundColor: colors.purple,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 60 : 50,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  skipButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
