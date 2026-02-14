
import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { authenticatedPost, authenticatedDelete } from '@/utils/api';
import { colors } from '@/styles/commonStyles';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  size?: 'small' | 'medium' | 'large';
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ userId, isFollowing: initialIsFollowing, size = 'medium', onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    console.log('User tapped Follow button for user:', userId);
    setLoading(true);
    const wasFollowing = isFollowing;

    // Optimistic UI update
    setIsFollowing(!wasFollowing);
    onFollowChange?.(!wasFollowing);

    try {
      if (wasFollowing) {
        await authenticatedDelete(`/api/users/${userId}/follow`);
      } else {
        await authenticatedPost(`/api/users/${userId}/follow`, {});
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // Revert on error
      setIsFollowing(wasFollowing);
      onFollowChange?.(wasFollowing);
    } finally {
      setLoading(false);
    }
  };

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const textSizeStyles = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  const buttonText = isFollowing ? 'Following' : 'Follow';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles[size],
        isFollowing ? styles.following : styles.notFollowing,
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Text style={[styles.text, textSizeStyles[size]]}>{buttonText}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  notFollowing: {
    backgroundColor: colors.coral,
  },
  following: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  text: {
    color: colors.text,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 12,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 16,
  },
});
