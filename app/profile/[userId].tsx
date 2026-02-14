
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFollows } from '@/hooks/useFollows';
import { FollowButton } from '@/components/FollowButton';
import { apiGet } from '@/utils/api';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ReportSheet from '@/components/ReportSheet';
import { useGifts } from '@/hooks/useGifts';
import SubscribeButton from '@/components/SubscribeButton';

// Helper to resolve image sources (handles both local and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface UserProfile {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  bio?: string;
}

interface Video {
  id: string;
  user_id: string;
  thumbnail_url: string;
  likes_count: number;
  views_count: number;
  created_at: string;
}

type TabType = 'videos' | 'likes' | 'gifters';

interface GiftLeaderboardEntry {
  username: string;
  avatar: string;
  totalCoinsGifted: number;
  giftCount: number;
  rank: number;
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [giftLeaderboard, setGiftLeaderboard] = useState<GiftLeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const { fetchLeaderboard } = useGifts();

  // Use the follow hooks for real-time follow data
  const {
    followers: followersCount,
    following: followingCount,
    loading: followLoading,
    refresh: refreshFollowData,
  } = useFollows(userId || '');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('[UserProfile] Showing toast:', message, type);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadGiftLeaderboard = useCallback(async () => {
    if (!userId) return;
    
    setLoadingLeaderboard(true);
    try {
      console.log('[UserProfile] Fetching gift leaderboard for user:', userId);
      const leaderboard = await fetchLeaderboard(userId);
      setGiftLeaderboard(leaderboard);
    } catch (error) {
      console.error('[UserProfile] Error fetching gift leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [userId, fetchLeaderboard]);

  const fetchProfileData = useCallback(async () => {
    if (!userId) {
      console.log('[UserProfile] No userId provided');
      return;
    }

    try {
      console.log('[UserProfile] Fetching profile for userId:', userId);
      
      // Fetch user profile
      const userProfile = await apiGet<UserProfile>(`/api/users/${userId}`);
      console.log('[UserProfile] Fetched profile:', userProfile);
      setProfile(userProfile);

      // Fetch user's videos
      const userVideos = await apiGet<Video[]>(`/api/users/${userId}/videos`);
      console.log('[UserProfile] Fetched videos:', userVideos.length);
      setVideos(userVideos);
      
      // Fetch gift leaderboard
      await loadGiftLeaderboard();
    } catch (error) {
      console.error('[UserProfile] Error fetching profile data:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, loadGiftLeaderboard]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleRefresh = useCallback(async () => {
    console.log('[UserProfile] Refreshing profile data');
    setRefreshing(true);
    await Promise.all([
      fetchProfileData(),
      refreshFollowData(),
    ]);
  }, [fetchProfileData, refreshFollowData]);

  const handleVideoPress = useCallback((videoId: string) => {
    console.log('[UserProfile] Video tapped:', videoId);
    // TODO: Navigate to video detail screen
    showToast('Video detail coming soon', 'info');
  }, []);

  const handleFollowersPress = useCallback(() => {
    console.log('[UserProfile] Followers tapped');
    router.push(`/follow-list?userId=${userId}&type=followers`);
  }, [userId]);

  const handleFollowingPress = useCallback(() => {
    console.log('[UserProfile] Following tapped');
    router.push(`/follow-list?userId=${userId}&type=following`);
  }, [userId]);

  const handleMessagePress = useCallback(() => {
    console.log('[UserProfile] Message button tapped, navigating to chat with user:', userId);
    if (userId) {
      router.push(`/messages/${userId}`);
    }
  }, [userId]);

  const handleReportPress = useCallback(() => {
    console.log('[UserProfile] Opening report sheet for user:', userId);
    setShowReportSheet(true);
  }, [userId]);

  // Calculate total likes from all videos
  const totalLikes = videos.reduce((sum, video) => sum + (video.likes_count || 0), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Profile',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Profile',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const username = profile.username || profile.name || 'user';
  const avatarUrl = profile.avatarUrl || profile.avatar_url;
  const bio = profile.bio;
  const followersText = String(followersCount);
  const followingText = String(followingCount);
  const likesText = String(totalLikes);
  const emptyVideosText = 'Este usuario no tiene videos';
  const privateText = 'Privado';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `@${username}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                console.log('[UserProfile] Three dots menu tapped');
                handleReportPress();
              }}
              style={styles.headerButton}
            >
              <IconSymbol
                ios_icon_name="ellipsis"
                android_material_icon_name="more-vert"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={resolveImageSource(avatarUrl)}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={48}
                  color={colors.text}
                />
              </View>
            )}
          </View>

          {/* Username */}
          <Text style={styles.username}>@{username}</Text>

          {/* Bio */}
          {bio && <Text style={styles.bio}>{bio}</Text>}

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
              <Text style={styles.statValue}>{followingText}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
              <Text style={styles.statValue}>{followersText}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{likesText}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <FollowButton targetUserId={userId || ''} size="large" />

            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleMessagePress}
            >
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="message"
                size={20}
                color={colors.text}
              />
              <Text style={styles.messageButtonText}>Mensaje</Text>
            </TouchableOpacity>
          </View>

          {/* Subscribe Button */}
          <View style={styles.subscribeContainer}>
            <SubscribeButton
              creatorId={userId || ''}
              onSubscribeSuccess={() => {
                console.log('[UserProfile] Subscription successful');
                showToast('Subscription successful!', 'success');
              }}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
            onPress={() => {
              console.log('[UserProfile] Videos tab tapped');
              setActiveTab('videos');
            }}
          >
            <IconSymbol
              ios_icon_name="square.grid.3x3.fill"
              android_material_icon_name="grid-on"
              size={24}
              color={activeTab === 'videos' ? colors.primary : colors.textSecondary}
            />
            {activeTab === 'videos' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'likes' && styles.tabActive]}
            onPress={() => {
              console.log('[UserProfile] Likes tab tapped');
              setActiveTab('likes');
            }}
          >
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={24}
              color={activeTab === 'likes' ? colors.primary : colors.textSecondary}
            />
            {activeTab === 'likes' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'gifters' && styles.tabActive]}
            onPress={() => {
              console.log('[UserProfile] Top Gifters tab tapped');
              setActiveTab('gifters');
            }}
          >
            <IconSymbol
              ios_icon_name="gift.fill"
              android_material_icon_name="card-giftcard"
              size={24}
              color={activeTab === 'gifters' ? colors.primary : colors.textSecondary}
            />
            {activeTab === 'gifters' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'gifters' ? (
          loadingLeaderboard ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : giftLeaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>No gifts received yet</Text>
              <Text style={styles.emptyStateSubtext}>Be the first to send a gift!</Text>
            </View>
          ) : (
            <View style={styles.leaderboardContainer}>
              <Text style={styles.leaderboardTitle}>🏆 Top Gifters</Text>
              {giftLeaderboard.map((entry, index) => {
                const rankDisplay = String(entry.rank);
                const coinsDisplay = String(entry.totalCoinsGifted);
                const giftsDisplay = String(entry.giftCount);
                
                return (
                  <View key={index} style={styles.leaderboardItem}>
                    <View style={styles.leaderboardRank}>
                      <Text style={styles.leaderboardRankText}>{rankDisplay}</Text>
                    </View>
                    <Image
                      source={resolveImageSource(entry.avatar)}
                      style={styles.leaderboardAvatar}
                    />
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardUsername}>{entry.username}</Text>
                      <View style={styles.leaderboardStats}>
                        <IconSymbol
                          ios_icon_name="dollarsign.circle.fill"
                          android_material_icon_name="monetization-on"
                          size={14}
                          color={colors.turquoise}
                        />
                        <Text style={styles.leaderboardCoins}>{coinsDisplay}</Text>
                        <Text style={styles.leaderboardGifts}>• {giftsDisplay} gifts</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : activeTab === 'videos' ? (
          videos.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="video.fill"
                android_material_icon_name="movie"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>{emptyVideosText}</Text>
            </View>
          ) : (
            <View style={styles.videosGrid}>
              {videos.map((video, index) => {
                const videoLikesText = String(video.likes_count || 0);
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.videoThumbnail}
                    onPress={() => handleVideoPress(video.id)}
                  >
                    <Image
                      source={resolveImageSource(video.thumbnail_url)}
                      style={styles.thumbnailImage}
                    />
                    <View style={styles.videoOverlay}>
                      <View style={styles.playIconContainer}>
                        <IconSymbol
                          ios_icon_name="play.fill"
                          android_material_icon_name="play-arrow"
                          size={32}
                          color="rgba(255, 255, 255, 0.9)"
                        />
                      </View>
                      <View style={styles.videoStats}>
                        <IconSymbol
                          ios_icon_name="heart.fill"
                          android_material_icon_name="favorite"
                          size={16}
                          color={colors.text}
                        />
                        <Text style={styles.videoStatsText}>{videoLikesText}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>{privateText}</Text>
            <Text style={styles.emptyStateSubtext}>Liked videos are private</Text>
          </View>
        )}
      </ScrollView>

      {/* Report Sheet */}
      <ReportSheet
        isVisible={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        targetId={userId || ''}
        targetType="user"
        targetName={username}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    paddingHorizontal: 16,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  messageButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscribeContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabActive: {
    // Active tab styling handled by indicator
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },

  // Videos Grid
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  videoThumbnail: {
    width: '33.333%',
    aspectRatio: 9 / 16,
    padding: 1,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.card,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  videoStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatsText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: 'bold',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    opacity: 0.7,
  },

  // Gift Leaderboard
  leaderboardContainer: {
    padding: 16,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  leaderboardRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  leaderboardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardCoins: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.turquoise,
  },
  leaderboardGifts: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
