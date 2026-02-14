
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPost, authenticatedDelete, apiGet } from '@/utils/api';
import { router } from 'expo-router';

// TypeScript Interfaces
export interface UseFollowsResult {
  followers: number;
  following: number;
  isFollowing: boolean;
  loading: boolean;
  toggleFollow: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UserProfile {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
  avatar_url?: string; // Support both naming conventions
  bio?: string;
  followers_count?: number;
  following_count?: number;
  followersCount?: number;
  followingCount?: number;
  createdAt?: string;
}

export interface UseFollowListResult {
  users: UserProfile[];
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing follow relationships
 * 
 * @param targetUserId - The ID of the user to check follow status for
 * @returns Follow counts, status, and actions
 */
export function useFollows(targetUserId: string): UseFollowsResult {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFollowData = useCallback(async () => {
    if (!targetUserId) {
      console.log('[useFollows] No targetUserId provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[useFollows] Fetching follow data for user:', targetUserId);

      // Fetch followers count (public endpoint)
      const followersResponse = await apiGet<{ count: number }>(
        `/api/users/${targetUserId}/followers/count`
      );
      setFollowers(followersResponse.count);
      console.log('[useFollows] Followers count:', followersResponse.count);

      // Fetch following count (public endpoint)
      const followingResponse = await apiGet<{ count: number }>(
        `/api/users/${targetUserId}/following/count`
      );
      setFollowing(followingResponse.count);
      console.log('[useFollows] Following count:', followingResponse.count);

      // Check if current user is following (requires auth)
      if (user) {
        try {
          const isFollowingResponse = await authenticatedGet<{ isFollowing: boolean }>(
            `/api/users/${targetUserId}/is-following`
          );
          setIsFollowing(isFollowingResponse.isFollowing);
          console.log('[useFollows] Is following:', isFollowingResponse.isFollowing);
        } catch (error) {
          console.error('[useFollows] Error checking follow status:', error);
          setIsFollowing(false);
        }
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('[useFollows] Error fetching follow data:', error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user]);

  const toggleFollow = useCallback(async () => {
    // Check if user is authenticated
    if (!user) {
      console.log('[useFollows] User not authenticated, redirecting to login');
      router.push('/auth');
      return;
    }

    // Prevent following yourself
    if (user.id === targetUserId) {
      console.log('[useFollows] Cannot follow yourself');
      return;
    }

    // Store previous state for rollback on error
    const previousIsFollowing = isFollowing;
    const previousFollowers = followers;

    try {
      // Optimistic update
      setIsFollowing(!isFollowing);
      setFollowers(isFollowing ? followers - 1 : followers + 1);
      console.log('[useFollows] Optimistic update - isFollowing:', !isFollowing);

      if (isFollowing) {
        // Unfollow
        console.log('[useFollows] Unfollowing user:', targetUserId);
        await authenticatedDelete(`/api/users/${targetUserId}/follow`, {});
        console.log('[useFollows] Successfully unfollowed');
      } else {
        // Follow
        console.log('[useFollows] Following user:', targetUserId);
        await authenticatedPost(`/api/users/${targetUserId}/follow`, {});
        console.log('[useFollows] Successfully followed');
      }

      // Refresh data to ensure consistency
      await fetchFollowData();
    } catch (error) {
      console.error('[useFollows] Error toggling follow:', error);
      // Rollback optimistic update on error
      setIsFollowing(previousIsFollowing);
      setFollowers(previousFollowers);
    }
  }, [user, targetUserId, isFollowing, followers, fetchFollowData]);

  const refresh = useCallback(async () => {
    console.log('[useFollows] Manual refresh triggered');
    await fetchFollowData();
  }, [fetchFollowData]);

  useEffect(() => {
    fetchFollowData();
  }, [fetchFollowData]);

  return {
    followers,
    following,
    isFollowing,
    loading,
    toggleFollow,
    refresh,
  };
}

/**
 * Custom hook for fetching lists of followers or following users
 * 
 * @param userId - The ID of the user to fetch followers/following for
 * @param type - Either 'followers' or 'following'
 * @returns List of user profiles and loading state
 */
export function useFollowList(
  userId: string,
  type: 'followers' | 'following'
): UseFollowListResult {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFollowList = useCallback(async () => {
    if (!userId) {
      console.log('[useFollowList] No userId provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`[useFollowList] Fetching ${type} for user:`, userId);

      // Fetch the list based on type
      const endpoint = `/api/users/${userId}/${type}`;
      const response = await apiGet<UserProfile[]>(endpoint);
      
      // Normalize the response to handle different naming conventions
      const normalizedUsers = response.map(user => ({
        ...user,
        username: user.username || user.name || 'Unknown',
        avatarUrl: user.avatarUrl || user.avatar_url || '',
        followers_count: user.followers_count || user.followersCount || 0,
        following_count: user.following_count || user.followingCount || 0,
      }));
      
      setUsers(normalizedUsers);
      console.log(`[useFollowList] Fetched ${normalizedUsers.length} ${type}`);
    } catch (error) {
      console.error(`[useFollowList] Error fetching ${type}:`, error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  const refresh = useCallback(async () => {
    console.log('[useFollowList] Manual refresh triggered');
    await fetchFollowList();
  }, [fetchFollowList]);

  useEffect(() => {
    fetchFollowList();
  }, [fetchFollowList]);

  return {
    users,
    loading,
    refresh,
  };
}
