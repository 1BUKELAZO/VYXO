
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAdmin } from '@/hooks/useAdmin';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string;
  role: string;
  is_banned: boolean;
  created_at: string;
  videosCount: number;
  followersCount: number;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) {
    return { uri: '' };
  }
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

export default function AdminUsersScreen() {
  const { fetchUsers, banUser, unbanUser } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [banReason, setBanReason] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log('Showing toast:', message, type);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadUsers = useCallback(async (searchQuery: string = '', pageNum: number = 1, append: boolean = false) => {
    console.log('Loading users...', { searchQuery, pageNum, append });
    try {
      if (!append) {
        setIsLoading(true);
      }
      const response = await fetchUsers(searchQuery, pageNum, 20);
      const newUsers = response.users || [];
      const totalCount = response.total || 0;

      if (append) {
        setUsers((prev) => [...prev, ...newUsers]);
      } else {
        setUsers(newUsers);
      }

      setTotal(totalCount);
      setHasMore(newUsers.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    loadUsers(search, 1, false);
  }, [search]);

  const handleRefresh = () => {
    console.log('Refreshing users...');
    setRefreshing(true);
    loadUsers(search, 1, false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      console.log('Loading more users...');
      loadUsers(search, page + 1, true);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      showToast('Please provide a reason for banning', 'error');
      return;
    }

    console.log('Banning user...', selectedUser.id, banReason);
    try {
      await banUser(selectedUser.id, banReason);
      showToast('User banned successfully', 'success');
      setBanModalVisible(false);
      setBanReason('');
      setSelectedUser(null);
      loadUsers(search, 1, false);
    } catch (err: any) {
      console.error('Failed to ban user:', err);
      showToast(err.message || 'Failed to ban user', 'error');
    }
  };

  const handleUnbanUser = async (user: AdminUser) => {
    console.log('Unbanning user...', user.id);
    try {
      await unbanUser(user.id);
      showToast('User unbanned successfully', 'success');
      loadUsers(search, 1, false);
    } catch (err: any) {
      console.error('Failed to unban user:', err);
      showToast(err.message || 'Failed to unban user', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderUser = ({ item }: { item: AdminUser }) => {
    const joinedDate = formatDate(item.created_at);
    const videosCountDisplay = item.videosCount?.toLocaleString() || '0';
    const followersCountDisplay = item.followersCount?.toLocaleString() || '0';

    return (
      <View style={styles.userCard}>
        <Image source={resolveImageSource(item.image)} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userStats}>
            <Text style={styles.userStat}>{videosCountDisplay} videos</Text>
            <Text style={styles.userStat}>{followersCountDisplay} followers</Text>
          </View>
          <Text style={styles.userDate}>Joined: {joinedDate}</Text>
        </View>
        <View style={styles.userActions}>
          {item.is_banned ? (
            <React.Fragment>
              <View style={styles.bannedBadge}>
                <Text style={styles.bannedBadgeText}>BANNED</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, styles.unbanButton]}
                onPress={() => handleUnbanUser(item)}
              >
                <Text style={styles.actionButtonText}>Unban</Text>
              </TouchableOpacity>
            </React.Fragment>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.banButton]}
              onPress={() => {
                setSelectedUser(item);
                setBanModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Ban</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => router.push(`/profile/${item.id}` as any)}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalDisplay = total.toLocaleString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Manage Users',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="arrow-back"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.searchContainer}>
        <IconSymbol
          ios_icon_name="search"
          android_material_icon_name="search"
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerText}>Total Users: {totalDisplay}</Text>
      </View>

      {isLoading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && users.length > 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <Modal
        visible={banModalVisible}
        onClose={() => {
          setBanModalVisible(false);
          setBanReason('');
          setSelectedUser(null);
        }}
        title="Ban User"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            Are you sure you want to ban {selectedUser?.name}?
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Reason for ban..."
            placeholderTextColor={colors.textSecondary}
            value={banReason}
            onChangeText={setBanReason}
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setBanModalVisible(false);
                setBanReason('');
                setSelectedUser(null);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={handleBanUser}
            >
              <Text style={styles.modalButtonText}>Ban User</Text>
            </TouchableOpacity>
          </View>
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
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  userStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  userStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userActions: {
    gap: 8,
  },
  bannedBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  bannedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  banButton: {
    backgroundColor: '#FF6B6B',
  },
  unbanButton: {
    backgroundColor: '#10B981',
  },
  viewButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  footerLoader: {
    marginVertical: 16,
  },
  modalContent: {
    gap: 16,
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#333',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
