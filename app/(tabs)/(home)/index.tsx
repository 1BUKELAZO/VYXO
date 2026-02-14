
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
  ImageSourcePropType,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/ui/Toast';
import { authenticatedPost, authenticatedDelete } from '@/utils/api';
import ReportSheet from '@/components/ReportSheet';
import ShareSheet from '@/components/ShareSheet';
import VideoOptionsModal from '@/components/VideoOptionsModal';
import { IconSymbol } from '@/components/IconSymbol';
import HashtagList from '@/components/HashtagList';
import DuetButton from '@/components/DuetButton';
import GiftButton from '@/components/GiftButton';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import MuxPlayer from '@mux/mux-player-react/lazy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { colors } from '@/styles/commonStyles';
import { useFeedAlgorithm, Video, FeedItem, AdItem } from '@/hooks/useFeedAlgorithm';
import { useLiveStream, LiveStream } from '@/hooks/useLiveStream';
import AdCard from '@/components/AdCard';
import { useAds } from '@/hooks/useAds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const VideoSkeleton = () => {
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  return (
    <View style={styles.videoContainer}>
      <Animated.View style={[styles.skeletonBox, animatedStyle]} />
    </View>
  );
};

interface LiveStreamItemProps {
  stream: LiveStream;
}

const LiveStreamItem = ({ stream }: LiveStreamItemProps) => {
  const formatViewerCount = (count: number): string => {
    if (count >= 1000000) {
      const millions = count / 1000000;
      return `${millions.toFixed(1)}M`;
    }
    if (count >= 1000) {
      const thousands = count / 1000;
      return `${thousands.toFixed(1)}K`;
    }
    return String(count);
  };

  const viewerCountText = formatViewerCount(stream.viewerCount);

  return (
    <TouchableOpacity
      style={styles.liveStreamCard}
      onPress={() => {
        console.log('User tapped live stream, navigating to watch screen');
        router.push(`/live/watch/${stream.id}`);
      }}
    >
      <View style={styles.liveStreamThumbnail}>
        <IconSymbol
          ios_icon_name="video.fill"
          android_material_icon_name="videocam"
          size={48}
          color={colors.textSecondary}
        />
        <View style={styles.liveBadge}>
          <View style={styles.liveBadgeDot} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
        <View style={styles.liveViewerCount}>
          <IconSymbol
            ios_icon_name="eye.fill"
            android_material_icon_name="visibility"
            size={12}
            color={colors.text}
          />
          <Text style={styles.liveViewerCountText}>{viewerCountText}</Text>
        </View>
      </View>
      <View style={styles.liveStreamInfo}>
        <View style={styles.liveStreamAvatar}>
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={20}
            color={colors.textSecondary}
          />
        </View>
        <View style={styles.liveStreamText}>
          <Text style={styles.liveStreamUsername} numberOfLines={1}>
            {stream.username}
          </Text>
          <Text style={styles.liveStreamTitle} numberOfLines={1}>
            {stream.title}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface VideoItemProps {
  video: Video;
  isActive: boolean;
  onView: (videoId: string) => void;
}

const VideoItem = ({ video, isActive, onView }: VideoItemProps) => {
  const rotation = useSharedValue(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [localVideo, setLocalVideo] = useState(video);
  const [viewRecorded, setViewRecorded] = useState(false);
  const muxPlayerRef = useRef<any>(null);

  const useMuxPlayer = (!!video.muxPlaybackId && video.status === 'ready') || !!video.masterPlaylistUrl;
  
  const videoSource = video.masterPlaylistUrl 
    ? video.masterPlaylistUrl 
    : (video.muxPlaybackId || video.videoUrl);

  const player = useVideoPlayer(!useMuxPlayer ? videoSource : '', (player) => {
    player.loop = true;
    player.muted = false;
  });

  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );

      if (!viewRecorded) {
        const viewTimer = setTimeout(() => {
          console.log('Recording view for video:', video.id);
          onView(video.id);
          setViewRecorded(true);
        }, 2000);

        return () => clearTimeout(viewTimer);
      }

      if (useMuxPlayer && muxPlayerRef.current) {
        muxPlayerRef.current.play();
      } else if (!useMuxPlayer) {
        player.play();
      }
    } else {
      setIsPlaying(false);
      rotation.value = 0;

      if (useMuxPlayer && muxPlayerRef.current) {
        muxPlayerRef.current.pause();
      } else if (!useMuxPlayer) {
        player.pause();
      }
    }
  }, [isActive, useMuxPlayer, viewRecorded, onView, player, rotation, video.id]);

  const discAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      console.log('User double-tapped video to like');
      handleLike();
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      console.log('User tapped video to toggle play/pause');
      if (isPlaying) {
        if (useMuxPlayer && muxPlayerRef.current) {
          muxPlayerRef.current.pause();
        } else {
          player.pause();
        }
        setIsPlaying(false);
      } else {
        if (useMuxPlayer && muxPlayerRef.current) {
          muxPlayerRef.current.play();
        } else {
          player.play();
        }
        setIsPlaying(true);
      }
    });

  const tapGesture = Gesture.Exclusive(doubleTap, singleTap);

  const handleLike = async () => {
    console.log('User tapped Like button on video:', video.id);
    const wasLiked = localVideo.isLiked;
    const newLikesCount = wasLiked ? localVideo.likesCount - 1 : localVideo.likesCount + 1;

    setLocalVideo({
      ...localVideo,
      isLiked: !wasLiked,
      likesCount: newLikesCount,
    });

    try {
      if (wasLiked) {
        await authenticatedDelete(`/api/videos/${video.id}/like`);
      } else {
        await authenticatedPost(`/api/videos/${video.id}/like`, {});
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setLocalVideo({
        ...localVideo,
        isLiked: wasLiked,
        likesCount: video.likesCount,
      });
    }
  };

  const handleComment = () => {
    console.log('User tapped Comment button, navigating to comments screen');
    router.push(`/comments/${video.id}`);
  };

  const handleSave = async () => {
    console.log('User tapped Save button on video:', video.id);
    const wasSaved = localVideo.isSaved;
    const newSavesCount = wasSaved ? (localVideo.savesCount || 0) - 1 : (localVideo.savesCount || 0) + 1;

    setLocalVideo({
      ...localVideo,
      isSaved: !wasSaved,
      savesCount: newSavesCount,
    });

    try {
      if (wasSaved) {
        await authenticatedDelete(`/api/videos/${video.id}/save`);
      } else {
        await authenticatedPost(`/api/videos/${video.id}/save`, {});
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
      setLocalVideo({
        ...localVideo,
        isSaved: wasSaved,
        savesCount: video.savesCount,
      });
    }
  };

  const handleFollow = async () => {
    console.log('User tapped Follow button on video:', video.userId);
    const wasFollowing = localVideo.isFollowing;

    setLocalVideo({
      ...localVideo,
      isFollowing: !wasFollowing,
    });

    try {
      if (wasFollowing) {
        await authenticatedDelete(`/api/users/${video.userId}/follow`);
      } else {
        await authenticatedPost(`/api/users/${video.userId}/follow`, {});
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      setLocalVideo({
        ...localVideo,
        isFollowing: wasFollowing,
      });
    }
  };

  const handleShare = () => {
    console.log('User tapped Share button, opening share sheet');
    setShowShare(true);
  };

  const handleOptions = () => {
    console.log('User tapped Options button, opening options modal');
    setShowOptions(true);
  };

  const handleProfileTap = () => {
    console.log('User tapped profile avatar, navigating to profile:', video.userId);
    router.push(`/profile/${video.userId}`);
  };

  const handleSoundTap = () => {
    console.log('User tapped sound name, navigating to sound page');
    if (video.soundId) {
      router.push(`/sound/${video.soundId}`);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      const formatted = (count / 1000000).toFixed(1);
      return `${formatted}M`;
    }
    if (count >= 1000) {
      const formatted = (count / 1000).toFixed(1);
      return `${formatted}K`;
    }
    return count.toString();
  };

  const likesDisplay = formatCount(localVideo.likesCount);
  const commentsDisplay = formatCount(localVideo.commentsCount);
  const savesDisplay = formatCount(localVideo.savesCount || 0);
  const videoRepliesDisplay = formatCount(localVideo.videoRepliesCount || 0);
  
  const soundDisplay = localVideo.soundName 
    || localVideo.soundTitle 
    || (localVideo.soundArtistName ? `${localVideo.soundArtistName} - Original Sound` : 'Original Sound');
  
  const thumbnailUrl = video.muxThumbnailUrl || video.thumbnailUrl;
  const previewUrl = video.gifUrl || thumbnailUrl;
  
  const isReplyVideo = localVideo.isReply && localVideo.parentVideoAuthorUsername;
  const replyToText = isReplyVideo ? `Reply to @${localVideo.parentVideoAuthorUsername}` : '';
  
  const isDuetVideo = localVideo.isDuet || localVideo.isStitch;
  const duetText = isDuetVideo && localVideo.duetWithUsername 
    ? `${localVideo.isDuet ? 'Duet' : 'Stitch'} with @${localVideo.duetWithUsername}` 
    : '';

  return (
    <View style={styles.videoContainer}>
      <GestureDetector gesture={tapGesture}>
        <View style={styles.videoWrapper}>
          {useMuxPlayer ? (
            video.masterPlaylistUrl ? (
              <MuxPlayer
                ref={muxPlayerRef}
                src={video.masterPlaylistUrl}
                streamType="on-demand"
                autoPlay={isActive}
                loop
                muted={false}
                controls={false}
                poster={previewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <MuxPlayer
                ref={muxPlayerRef}
                playbackId={video.muxPlaybackId}
                streamType="on-demand"
                autoPlay={isActive}
                loop
                muted={false}
                controls={false}
                poster={previewUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )
          ) : (
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
          )}
          {!isPlaying && (
            <View style={styles.pauseOverlay}>
              <IconSymbol
                ios_icon_name="play.fill"
                android_material_icon_name="play-arrow"
                size={64}
                color="rgba(255, 255, 255, 0.8)"
              />
            </View>
          )}
          {video.status === 'processing' && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.purple} />
              <Text style={styles.processingText}>Processing video...</Text>
            </View>
          )}
        </View>
      </GestureDetector>

      <View style={styles.leftContainer}>
        <View style={styles.userInfo}>
          <TouchableOpacity onPress={handleProfileTap}>
            <Image
              source={resolveImageSource(localVideo.avatarUrl)}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <Text style={styles.username}>{localVideo.username}</Text>
        </View>

        {isReplyVideo && (
          <View style={styles.replyIndicator}>
            <IconSymbol
              ios_icon_name="arrowshape.turn.up.left"
              android_material_icon_name="reply"
              size={14}
              color={colors.purple}
            />
            <Text style={styles.replyText}>{replyToText}</Text>
          </View>
        )}
        
        {isDuetVideo && (
          <View style={[styles.replyIndicator, { backgroundColor: 'rgba(0, 217, 255, 0.2)' }]}>
            <IconSymbol
              ios_icon_name="person.2"
              android_material_icon_name="group"
              size={14}
              color={colors.turquoise}
            />
            <Text style={[styles.replyText, { color: colors.turquoise }]}>{duetText}</Text>
          </View>
        )}

        <HashtagList
          text={localVideo.caption}
          style={styles.caption}
          numberOfLines={3}
        />

        <TouchableOpacity onPress={handleSoundTap} style={styles.soundContainer}>
          <IconSymbol
            ios_icon_name="music.note"
            android_material_icon_name="music-note"
            size={16}
            color={colors.text}
          />
          <Text style={styles.soundText} numberOfLines={1}>
            {soundDisplay}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightContainer}>
        <View style={styles.actionItem}>
          <TouchableOpacity onPress={handleProfileTap}>
            <Image
              source={resolveImageSource(localVideo.avatarUrl)}
              style={styles.actionAvatar}
            />
          </TouchableOpacity>
          {!localVideo.isFollowing && (
            <TouchableOpacity
              style={styles.followButton}
              onPress={handleFollow}
            >
              <IconSymbol
                ios_icon_name="plus"
                android_material_icon_name="add"
                size={16}
                color={colors.text}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
          <IconSymbol
            ios_icon_name={localVideo.isLiked ? 'heart.fill' : 'heart'}
            android_material_icon_name={localVideo.isLiked ? 'favorite' : 'favorite-border'}
            size={32}
            color={localVideo.isLiked ? colors.like : colors.text}
          />
          <Text style={styles.actionText}>{likesDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleComment}>
          <IconSymbol
            ios_icon_name="bubble.right"
            android_material_icon_name="chat-bubble-outline"
            size={32}
            color={colors.text}
          />
          <Text style={styles.actionText}>{commentsDisplay}</Text>
        </TouchableOpacity>

        {(localVideo.videoRepliesCount || 0) > 0 && (
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => {
              console.log('User tapped Video Replies button, navigating to comments with video replies tab');
              router.push({
                pathname: `/comments/${video.id}`,
                params: {
                  videoAuthorUsername: video.username,
                  tab: 'videoReplies',
                },
              });
            }}
          >
            <IconSymbol
              ios_icon_name="video.fill"
              android_material_icon_name="videocam"
              size={32}
              color={colors.purple}
            />
            <Text style={styles.actionText}>{videoRepliesDisplay}</Text>
          </TouchableOpacity>
        )}

        {(localVideo.allowDuets || localVideo.allowStitches) && (
          <DuetButton
            videoId={video.id}
            allowDuets={localVideo.allowDuets || false}
            duetsCount={localVideo.duetsCount || 0}
          />
        )}

        <View style={styles.actionItem}>
          <GiftButton
            videoId={video.id}
            recipientId={video.userId}
            onGiftSent={(giftName, giftIcon) => {
              console.log('Gift sent:', giftName, giftIcon);
            }}
          />
        </View>

        <TouchableOpacity style={styles.actionItem} onPress={handleSave}>
          <IconSymbol
            ios_icon_name={localVideo.isSaved ? 'bookmark.fill' : 'bookmark'}
            android_material_icon_name={localVideo.isSaved ? 'bookmark' : 'bookmark-border'}
            size={32}
            color={localVideo.isSaved ? colors.save : colors.text}
          />
          <Text style={styles.actionText}>{savesDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleShare}>
          <IconSymbol
            ios_icon_name="arrowshape.turn.up.right"
            android_material_icon_name="share"
            size={32}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleOptions}>
          <IconSymbol
            ios_icon_name="ellipsis"
            android_material_icon_name="more-vert"
            size={32}
            color={colors.text}
          />
        </TouchableOpacity>

        <Animated.View style={[styles.musicDisc, discAnimatedStyle]}>
          <Image
            source={resolveImageSource(localVideo.avatarUrl)}
            style={styles.musicDiscImage}
          />
        </Animated.View>
      </View>

      <ShareSheet
        isVisible={showShare}
        onClose={() => setShowShare(false)}
        videoId={video.id}
        videoUrl={video.videoUrl}
      />

      <VideoOptionsModal
        isVisible={showOptions}
        onClose={() => setShowOptions(false)}
        videoId={video.id}
        onSave={handleSave}
        onShare={handleShare}
        onReport={() => {
          setShowOptions(false);
          setShowReport(true);
        }}
      />

      <ReportSheet
        isVisible={showReport}
        onClose={() => setShowReport(false)}
        targetId={video.id}
        targetType="video"
        targetName={`Video by ${video.username}`}
      />
    </View>
  );
};

export default function HomeScreen() {
  const flatListRef = useRef<FlatList>(null);
  const { user, loading: authLoading } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);

  const searchParams = useLocalSearchParams();

  const { fetchActiveStreams } = useLiveStream();
  const { recordAdClick } = useAds();

  const {
    videos,
    feedItems,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    recordView,
  } = useFeedAlgorithm({
    type: 'foryou',
    limit: 20,
    autoFetch: !!user && !authLoading,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadActiveStreams = useCallback(async () => {
    try {
      const streams = await fetchActiveStreams();
      setActiveStreams(streams);
    } catch (err) {
      console.error('Failed to load active streams:', err);
    }
  }, [fetchActiveStreams]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  useEffect(() => {
    if (user && !authLoading) {
      loadActiveStreams();
      const interval = setInterval(loadActiveStreams, 30000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading, loadActiveStreams]);

  useEffect(() => {
    if (searchParams.newVideo && videos.length > 0) {
      console.log('New video uploaded, showing at top of feed');
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      router.setParams({ newVideo: undefined });
    }
  }, [searchParams, videos]);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to auth');
      router.replace('/auth');
    }
  }, [user, authLoading]);

  if (authLoading || (loading && videos.length === 0)) {
    return (
      <View style={styles.container}>
        <VideoSkeleton />
      </View>
    );
  }

  const handleAdClick = async (impressionId: string) => {
    console.log('[Ads] User clicked ad, recording click:', impressionId);
    try {
      await recordAdClick(impressionId);
    } catch (err) {
      console.error('[Ads] Failed to record ad click:', err);
    }
  };

  const handleAdSkip = () => {
    console.log('[Ads] User skipped ad, moving to next item');
    if (flatListRef.current && currentIndex < feedItems.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const renderFeedItem = ({ item, index }: { item: FeedItem; index: number }) => {
    if ('type' in item && item.type === 'ad') {
      const adItem = item as AdItem;
      return (
        <AdCard
          ad={{
            campaignId: adItem.campaignId,
            creative_url: adItem.creative_url,
            cta_text: adItem.cta_text,
            cta_url: adItem.cta_url,
            impressionId: adItem.impressionId,
          }}
          isFocused={index === currentIndex}
          onSkip={handleAdSkip}
          onAdClick={handleAdClick}
        />
      );
    }
    
    const video = item as Video;
    return (
      <VideoItem 
        video={video} 
        isActive={index === currentIndex}
        onView={recordView}
      />
    );
  };

  if (feedItems.length === 0 && !loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="video.slash"
            android_material_icon_name="videocam-off"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to create content!
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/camera')}
          >
            <Text style={styles.createButtonText}>Create Video</Text>
          </TouchableOpacity>
        </View>
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          onHide={() => setToastVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {activeStreams.length > 0 && (
        <View style={styles.liveStreamsBanner}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liveStreamsScroll}
          >
            {activeStreams.map((stream) => (
              <LiveStreamItem key={stream.id} stream={stream} />
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
          }
        }}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              loadActiveStreams();
            }}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            console.log('Reached end of list, loading more videos');
            loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && feedItems.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={colors.purple} />
            </View>
          ) : null
        }
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  liveStreamsBanner: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
  },
  liveStreamsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  liveStreamCard: {
    width: 140,
    marginRight: 12,
  },
  liveStreamThumbnail: {
    width: 140,
    height: 200,
    backgroundColor: colors.card,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text,
  },
  liveBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  liveViewerCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveViewerCountText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  liveStreamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  liveStreamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveStreamText: {
    flex: 1,
  },
  liveStreamUsername: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  liveStreamTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  processingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  leftContainer: {
    position: 'absolute',
    left: 16,
    bottom: 100,
    maxWidth: SCREEN_WIDTH - 120,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.text,
    marginRight: 12,
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  caption: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  replyText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '600',
  },
  soundContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  rightContainer: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
    gap: 24,
  },
  actionItem: {
    alignItems: 'center',
    gap: 4,
  },
  actionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.text,
  },
  followButton: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  musicDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  musicDiscImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonBox: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: colors.coral,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  createButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
