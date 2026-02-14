
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

interface AdminVideo {
  id: string;
  user_id: string;
  username: string;
  caption: string;
  thumbnail_url: string;
  views_count: number;
  likes_count: number;
  created_at: string;
  status: string;
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

export default function AdminVideosScreen() {
  const { fetchVideos, deleteVideo } = useAdmin();
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedVideo, setSelectedVideo] = useState<AdminVideo | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    console.log('Showing toast:', message, type);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadVideos = useCallback(async (searchQuery: string = '', pageNum: number = 1, append: boolean = false) => {
    console.log('Loading videos...', { searchQuery, pageNum, append });
    try {
      if (!append) {
        setIsLoading(true);
      }
      const response = await fetchVideos(searchQuery, pageNum, 20);
      const newVideos = response.videos || [];
      const totalCount = response.total || 0;

      if (append) {
        setVideos((prev) => [...prev, ...newVideos]);
      } else {
        setVideos(newVideos);
      }

      setTotal(totalCount);
      setHasMore(newVideos.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to load videos:', err);
      showToast(err.message || 'Failed to load videos', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [fetchVideos]);

  useEffect(() => {
    loadVideos(search, 1, false);
  }, [search]);

  const handleRefresh = () => {
    console.log('Refreshing videos...');
    setRefreshing(true);
    loadVideos(search, 1, false);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      console.log('Loading more videos...');
      loadVideos(search, page + 1, true);
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) {
      return;
    }

    console.log('Deleting video...', selectedVideo.id);
    try {
      await deleteVideo(selectedVideo.id);
      showToast('Video deleted successfully', 'success');
      setDeleteModalVisible(false);
      setSelectedVideo(null);
      loadVideos(search, 1, false);
    } catch (err: any) {
      console.error('Failed to delete video:', err);
      showToast(err.message || 'Failed to delete video', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const renderVideo = ({ item }: { item: AdminVideo }) => {
    const uploadedDate = formatDate(item.created_at);
    const viewsDisplay = item.views_count?.toLocaleString() || '0';
    const likesDisplay = item.likes_count?.toLocaleString() || '0';

    return (
      <View style={styles.videoCard}>
        <Image source={resolveImageSource(item.thumbnail_url)} style={styles.thumbnail} />
        <View style={styles.videoInfo}>
          <Text style={styles.videoCaption} numberOfLines={2}>
            {item.caption || 'No caption'}
          </Text>
          <Text style={styles.videoUsername}>@{item.username}</Text>
          <View style={styles.videoStats}>
            <Text style={styles.videoStat}>{viewsDisplay} views</Text>
            <Text style={styles.videoStat}>{likesDisplay} likes</Text>
          </View>
          <Text style={styles.videoDate}>Uploaded: {uploadedDate}</Text>
        </View>
        <View style={styles.videoActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              setSelectedVideo(item);
              setDeleteModalVisible(true);
            }}
          >
            <IconSymbol
              ios_icon_name="delete"
              android_material_icon_name="delete"
              size={20}
              color="#fff"
            />
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
          title: 'Manage Videos',
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
          placeholder="Search videos by caption or username..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerText}>Total Videos: {totalDisplay}</Text>
      </View>

      {isLoading && videos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideo}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && videos.length > 0 ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <Modal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setSelectedVideo(null);
        }}
        title="Delete Video"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            Are you sure you want to permanently delete this video?
          </Text>
          <Text style={styles.modalSubtext}>
            This action cannot be undone.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setDeleteModalVisible(false);
                setSelectedVideo(null);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={handleDeleteVideo}
            >
              <Text style={styles.modalButtonText}>Delete</Text>
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
  videoCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  thumbnail: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoCaption: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  videoUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  videoStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  videoDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  videoActions: {
    justifyContent: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
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
  modalSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
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
