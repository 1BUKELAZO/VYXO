
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import Toast from '@/components/ui/Toast';
import { useFollows, useFollowList, UserProfile as FollowUserProfile } from '@/hooks/useFollows';
import { useCreatorEarnings } from '@/hooks/useCreatorEarnings';
import Modal from '@/components/ui/Modal';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  isFollowing: boolean;
}

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showCreatorApplicationModal, setShowCreatorApplicationModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [paymentEmail, setPaymentEmail] = useState('');
  const [applying, setApplying] = useState(false);

  // Use the follow hooks for real-time follow data
  const {
    followers: followersCount,
    following: followingCount,
    loading: followLoading,
    refresh: refreshFollowData,
  } = useFollows(user?.id || '');

  const {
    users: followersList,
    loading: followersListLoading,
    refresh: refreshFollowersList,
  } = useFollowList(user?.id || '', 'followers');

  const {
    users: followingList,
    loading: followingListLoading,
    refresh: refreshFollowingList,
  } = useFollowList(user?.id || '', 'following');

  // Creator Fund hooks
  const {
    applicationStatus,
    fetchApplicationStatus,
    applyForCreatorFund,
  } = useCreatorEarnings();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    console.log('[API] Fetching user profile for:', user.id);
    setProfileLoading(true);
    try {
      const userProfile = await authenticatedGet<UserProfile>(`/api/users/${user.id}`);
      console.log('[API] Fetched profile:', userProfile);
      setProfile(userProfile);
    } catch (error) {
      console.error('[API] Error fetching profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchApplicationStatus();
    }
  }, [user, fetchProfile, fetchApplicationStatus]);

  const fetchBlockedUsers = useCallback(async () => {
    console.log('[API] Fetching blocked users');
    setBlockedLoading(true);
    try {
      const blocked = await authenticatedGet<BlockedUser[]>('/api/blocks');
      console.log('[API] Fetched blocked users:', blocked.length);
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('[API] Error fetching blocked users:', error);
      showToast('Failed to load blocked users', 'error');
    } finally {
      setBlockedLoading(false);
    }
  }, []);

  const handleUnblock = useCallback(async (blockedId: string) => {
    console.log('[API] Unblocking user:', blockedId);
    try {
      await authenticatedDelete(`/api/blocks/${blockedId}`);
      console.log('[API] User unblocked successfully');
      showToast('User unblocked', 'success');
      // Refresh the blocked users list
      fetchBlockedUsers();
    } catch (error) {
      console.error('[API] Error unblocking user:', error);
      showToast('Failed to unblock user', 'error');
    }
  }, [fetchBlockedUsers]);

  const handleSignOut = useCallback(async () => {
    console.log('User tapped sign out button');
    setLoading(true);
    try {
      await signOut();
      console.log('User signed out successfully');
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  const handleCreatorFundPress = () => {
    const displayFollowersCount = followersCount;
    
    if (applicationStatus?.hasApplied) {
      // Already applied, navigate to dashboard or show status
      if (applicationStatus.status === 'approved') {
        router.push('/creator/dashboard');
      } else {
        const statusText = applicationStatus.status === 'pending' 
          ? 'Your application is pending review' 
          : 'Your application was rejected';
        showToast(statusText, 'info');
      }
      return;
    }

    if (displayFollowersCount < 10000) {
      showToast('You need at least 10,000 followers to apply', 'error');
      return;
    }

    setShowCreatorApplicationModal(true);
  };

  const handleCreatorApplicationSubmit = async () => {
    if (!paymentEmail.trim()) {
      showToast('Please enter your payment email', 'error');
      return;
    }

    console.log('[Creator] Submitting application');
    setApplying(true);
    const success = await applyForCreatorFund(paymentMethod, { email: paymentEmail });
    setApplying(false);

    if (success) {
      showToast('Application submitted successfully!', 'success');
      setShowCreatorApplicationModal(false);
      setPaymentEmail('');
      await fetchApplicationStatus();
    } else {
      showToast('Failed to submit application', 'error');
    }
  };

  if (!user || profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.name || user.name || user.email || 'User';
  const username = profile?.username || user.email?.split('@')[0] || 'user';
  // Use real-time follow counts from useFollows hook
  const displayFollowersCount = followersCount;
  const displayFollowingCount = followingCount;
  const likesCount = profile?.likesCount || 0;

  const isEligibleForCreatorFund = displayFollowersCount >= 10000;
  const hasApplied = applicationStatus?.hasApplied || false;
  const isApproved = applicationStatus?.status === 'approved';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={48}
                color={colors.text}
              />
            </View>
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{username}</Text>

          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setShowFollowingModal(true)}
            >
              <Text style={styles.statValue}>{displayFollowingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setShowFollowersModal(true)}
            >
              <Text style={styles.statValue}>{displayFollowersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{likesCount}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => console.log('Edit profile tapped')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Creator Fund Section */}
        {(isEligibleForCreatorFund || hasApplied) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Creator Fund</Text>
            <TouchableOpacity
              style={[
                styles.creatorFundCard,
                isApproved && styles.creatorFundCardApproved
              ]}
              onPress={handleCreatorFundPress}
            >
              <View style={styles.creatorFundLeft}>
                <View style={[
                  styles.creatorFundIcon,
                  isApproved && styles.creatorFundIconApproved
                ]}>
                  <IconSymbol
                    ios_icon_name="dollarsign.circle.fill"
                    android_material_icon_name="attach-money"
                    size={24}
                    color={isApproved ? colors.success : colors.purple}
                  />
                </View>
                <View style={styles.creatorFundInfo}>
                  <Text style={styles.creatorFundTitle}>
                    {isApproved ? 'Creator Dashboard' : hasApplied ? 'Application Pending' : 'Apply for Creator Fund'}
                  </Text>
                  <Text style={styles.creatorFundDescription}>
                    {isApproved 
                      ? 'View your earnings and analytics' 
                      : hasApplied 
                      ? 'Your application is under review' 
                      : 'Earn money from your videos'}
                  </Text>
                </View>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Videos</Text>
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="video.fill"
              android_material_icon_name="movie"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateText}>No videos yet</Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/analytics/dashboard')}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="chart.bar.fill"
                android_material_icon_name="analytics"
                size={24}
                color={colors.accent}
              />
              <Text style={styles.settingText}>Analytics Dashboard</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/subscription/manage')}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={24}
                color={colors.purple}
              />
              <Text style={styles.settingText}>Manage Subscriptions</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              fetchBlockedUsers();
              setShowBlockedModal(true);
            }}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="hand.raised.fill"
                android_material_icon_name="block"
                size={24}
                color={colors.secondary}
              />
              <Text style={styles.settingText}>Blocked Users</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/seed-videos')}
          >
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.settingText}>Seed Test Videos</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="arrow.right.square"
                android_material_icon_name="logout"
                size={20}
                color={colors.text}
              />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Followers Modal */}
      <Modal
        visible={showFollowersModal}
        title="Followers"
        message=""
        type="info"
        onClose={() => setShowFollowersModal(false)}
      >
        <View style={styles.followListContainer}>
          {followersListLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : followersList.length === 0 ? (
            <Text style={styles.emptyFollowText}>No followers yet</Text>
          ) : (
            <FlatList
              data={followersList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.followListItem}>
                  <View style={styles.followListAvatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={24}
                      color={colors.text}
                    />
                  </View>
                  <View style={styles.followListInfo}>
                    <Text style={styles.followListUsername}>@{item.username}</Text>
                    {item.bio && <Text style={styles.followListBio}>{item.bio}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Following Modal */}
      <Modal
        visible={showFollowingModal}
        title="Following"
        message=""
        type="info"
        onClose={() => setShowFollowingModal(false)}
      >
        <View style={styles.followListContainer}>
          {followingListLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : followingList.length === 0 ? (
            <Text style={styles.emptyFollowText}>Not following anyone yet</Text>
          ) : (
            <FlatList
              data={followingList}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.followListItem}>
                  <View style={styles.followListAvatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={24}
                      color={colors.text}
                    />
                  </View>
                  <View style={styles.followListInfo}>
                    <Text style={styles.followListUsername}>@{item.username}</Text>
                    {item.bio && <Text style={styles.followListBio}>{item.bio}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedModal}
        title="Blocked Users"
        message=""
        type="info"
        onClose={() => setShowBlockedModal(false)}
      >
        <View style={styles.followListContainer}>
          {blockedLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : blockedUsers.length === 0 ? (
            <Text style={styles.emptyFollowText}>No blocked users</Text>
          ) : (
            <FlatList
              data={blockedUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.blockedListItem}>
                  <View style={styles.followListAvatar}>
                    <IconSymbol
                      ios_icon_name="person.fill"
                      android_material_icon_name="person"
                      size={24}
                      color={colors.text}
                    />
                  </View>
                  <View style={styles.followListInfo}>
                    <Text style={styles.followListUsername}>User ID: {item.blocked_id}</Text>
                    <Text style={styles.followListBio}>
                      Blocked {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() => handleUnblock(item.blocked_id)}
                  >
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Creator Fund Application Modal */}
      <Modal
        visible={showCreatorApplicationModal}
        title="Apply for Creator Fund"
        message=""
        type="info"
        onClose={() => {
          setShowCreatorApplicationModal(false);
          setPaymentEmail('');
        }}
      >
        <View style={styles.applicationModalContent}>
          <Text style={styles.applicationModalText}>
            Join the VYXO Creator Fund and start earning money from your videos!
          </Text>
          
          <Text style={styles.applicationModalLabel}>Payment Method</Text>
          <View style={styles.paymentMethodSelector}>
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'paypal' && styles.paymentMethodButtonActive
              ]}
              onPress={() => setPaymentMethod('paypal')}
            >
              <Text style={[
                styles.paymentMethodButtonText,
                paymentMethod === 'paypal' && styles.paymentMethodButtonTextActive
              ]}>
                PayPal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentMethodButton,
                paymentMethod === 'stripe' && styles.paymentMethodButtonActive
              ]}
              onPress={() => setPaymentMethod('stripe')}
            >
              <Text style={[
                styles.paymentMethodButtonText,
                paymentMethod === 'stripe' && styles.paymentMethodButtonTextActive
              ]}>
                Stripe
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.applicationModalLabel}>Payment Email</Text>
          <TextInput
            style={styles.applicationInput}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={paymentEmail}
            onChangeText={setPaymentEmail}
          />

          <TouchableOpacity
            style={[styles.applicationSubmitButton, applying && styles.applicationSubmitButtonDisabled]}
            onPress={handleCreatorApplicationSubmit}
            disabled={applying}
          >
            {applying ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.applicationSubmitButtonText}>Submit Application</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

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
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 20,
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
    backgroundColor: colors.border,
  },
  editButton: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  creatorFundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  creatorFundCardApproved: {
    borderColor: colors.success,
  },
  creatorFundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  creatorFundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.purple + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorFundIconApproved: {
    backgroundColor: colors.success + '20',
  },
  creatorFundInfo: {
    flex: 1,
  },
  creatorFundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  creatorFundDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  followListContainer: {
    maxHeight: 400,
    width: '100%',
  },
  followListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  followListAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  followListInfo: {
    flex: 1,
  },
  followListUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  followListBio: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyFollowText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  blockedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unblockButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applicationModalContent: {
    width: '100%',
    paddingTop: 16,
  },
  applicationModalText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 24,
    lineHeight: 24,
  },
  applicationModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  paymentMethodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentMethodButtonTextActive: {
    color: colors.text,
  },
  applicationInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 24,
  },
  applicationSubmitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applicationSubmitButtonDisabled: {
    opacity: 0.5,
  },
  applicationSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
