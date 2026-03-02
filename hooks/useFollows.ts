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
  avatar_url?: string;
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

      // 🔧 FIX: Silenciar errores de followers count
      try {
        const followersResponse = await apiGet<{ count: number }>(
          `/api/users/${targetUserId}/followers/count`
        );
        setFollowers(followersResponse.count);
      } catch (err) {
        console.log('[useFollows] Followers count fetch failed (expected), using 0');
        setFollowers(0);
      }

      // 🔧 FIX: Silenciar errores de following count
      try {
        const followingResponse = await apiGet<{ count: number }>(
          `/api/users/${targetUserId}/following/count`
        );
        setFollowing(followingResponse.count);
      } catch (err) {
        console.log('[useFollows] Following count fetch failed (expected), using 0');
        setFollowing(0);
      }

      // 🔧 FIX: Silenciar errores de is-following check
      if (user) {
        try {
          const isFollowingResponse = await authenticatedGet<{ isFollowing: boolean }>(
            `/api/users/${targetUserId}/is-following`
          );
          setIsFollowing(isFollowingResponse.isFollowing);
        } catch (error) {
          console.log('[useFollows] Is-following check failed (expected), using false');
          setIsFollowing(false);
        }
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.log('[useFollows] General error (silent), using defaults');
      setFollowers(0);
      setFollowing(0);
      setIsFollowing(false);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user]);

  const toggleFollow = useCallback(async () => {
    if (!user) {
      console.log('[useFollows] User not authenticated, redirecting to login');
      router.push('/auth');
      return;
    }

    if (user.id === targetUserId) {
      console.log('[useFollows] Cannot follow yourself');
      return;
    }

    const previousIsFollowing = isFollowing;
    const previousFollowers = followers;

    try {
      setIsFollowing(!isFollowing);
      setFollowers(isFollowing ? followers - 1 : followers + 1);

      if (isFollowing) {
        await authenticatedDelete(`/api/users/${targetUserId}/follow`, {});
      } else {
        await authenticatedPost(`/api/users/${targetUserId}/follow`, {});
      }

      await fetchFollowData();
    } catch (error) {
      console.log('[useFollows] Toggle follow failed, rolling back');
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

      const endpoint = `/api/users/${userId}/${type}`;
      const response = await apiGet<UserProfile[]>(endpoint);
      
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
      console.log(`[useFollowList] Fetch ${type} failed (expected), using empty array`);
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