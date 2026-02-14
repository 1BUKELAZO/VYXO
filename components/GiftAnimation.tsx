
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/styles/commonStyles';

interface GiftAnimationProps {
  giftIcon: string;
  giftName: string;
  onAnimationEnd: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GiftAnimation({ giftIcon, giftName, onAnimationEnd }: GiftAnimationProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    console.log('Starting gift animation:', giftName);
    
    // Animate gift floating up
    translateY.value = withSequence(
      withTiming(-SCREEN_HEIGHT * 0.3, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(-SCREEN_HEIGHT * 0.5, {
        duration: 500,
        easing: Easing.in(Easing.cubic),
      })
    );

    // Scale animation
    scale.value = withSequence(
      withTiming(1.5, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
    );

    // Opacity animation
    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 500 }, () => {
        runOnJS(onAnimationEnd)();
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.giftContainer, animatedStyle]}>
        <Text style={styles.giftIcon}>{giftIcon}</Text>
        <View style={styles.giftNameContainer}>
          <Text style={styles.giftName}>{giftName}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  giftContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftIcon: {
    fontSize: 120,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  giftNameContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  giftName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
});
