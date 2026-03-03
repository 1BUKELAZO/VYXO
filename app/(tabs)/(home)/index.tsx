// app/tabs/home/index.tsx
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
  Pressable,
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [localVideo, setLocalVideo] = useState(video);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const muxPlayerRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(true);

  const useMuxPlayer = (!!video.muxPlaybackId && video.status === 'ready') || !!video.masterPlaylistUrl;
  
  const videoSource = video.masterPlaylistUrl 
    ? video.masterPlaylistUrl 
    : (video.muxPlaybackId || video.videoUrl);

  const player = useVideoPlayer(!useMuxPlayer ? videoSource : '', (player) => {
    player.loop = true;
    player.muted = false;
  });

  // Sync ref with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      try {
        if (useMuxPlayer && muxPlayerRef.current) {
          muxPlayerRef.current.pause?.();
        } else if (!useMuxPlayer && player) {
          player.pause();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [useMuxPlayer, player]);

  // Handle isActive changes (scroll between videos)
  useEffect(() => {
    if (!isMountedRef.current) return;

    try {
      if (isActive) {
        if (isPlayingRef.current) {
          rotation.value = withRepeat(
            withTiming(360, { duration: 3000, easing: Easing.linear }),
            -1,
            false
          );
          
          if (useMuxPlayer && muxPlayerRef.current) {
            muxPlayerRef.current.play?.().catch(() => {});
          } else if (!useMuxPlayer) {
            player?.play?.().catch(() => {});
          }
        }

        if (!viewRecorded) {
          viewTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              console.log('Recording view for video:', video.id);
              onView(video.id);
              setViewRecorded(true);
            }
          }, 2000);
        }
      } else {
        rotation.value = 0;
        if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
        
        if (useMuxPlayer && muxPlayerRef.current) {
          muxPlayerRef.current.pause?.().catch(() => {});
        } else if (!useMuxPlayer) {
          player?.pause?.().catch(() => {});
        }
      }
    } catch (error) {
      console.log('Player state error (non-critical):', error);
    }
  }, [isActive, useMuxPlayer, viewRecorded, onView, player, rotation, video.id]);

  const discAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Direct play/pause control
  const togglePlayPause = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const newState = !isPlayingRef.current;
    setIsPlaying(newState);
    
    try {
      if (useMuxPlayer && muxPlayerRef.current) {
        if (newState) {
          muxPlayerRef.current.play?.().catch(() => {});
        } else {
          muxPlayerRef.current.pause?.().catch(() => {});
        }
      } else if (!useMuxPlayer) {
        if (newState) {
          player?.play?.().catch(() => {});
        } else {
          player?.pause?.().catch(() => {});
        }
      }
    } catch (error) {
      console.log('Direct toggle error:', error);
    }
  }, [useMuxPlayer, player]);

  // Handle tap with proper double-tap detection
  const handleVideoPress = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    // Double tap detected
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      handleLike();
      return;
    }
    
    lastTapRef.current = now;
    
    // Single tap - toggle play/pause immediately
    tapTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        togglePlayPause();
      }
      tapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY);
  }, [togglePlayPause]);

  const handleLike = async () => {
    console.log('User double-tapped to like video:', video.id);
    if (localVideo.isLiked) return;
    
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);
    
    const newLikesCount = localVideo.likesCount + 1;

    setLocalVideo({
      ...localVideo,
      isLiked: true,
      likesCount: newLikesCount,
    });

    try {
      await authenticatedPost(`/api/videos/${video.id}/like`, {});
    } catch (error) {
      console.error('Failed to toggle like:', error);
      if (isMountedRef.current) {
        setLocalVideo({
          ...localVideo,
          isLiked: false,
          likesCount: localVideo.likesCount,
        });
      }
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
      if (isMountedRef.current) {
        setLocalVideo({
          ...localVideo,
          isSaved: wasSaved,
          savesCount: video.savesCount,
        });
      }
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
      if (isMountedRef.current) {
        setLocalVideo({
          ...localVideo,
          isFollowing: wasFollowing,
        });
      }
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
      {/* FIX: Pressable en lugar de TouchableOpacity para mejor respuesta */}
      <Pressable
        onPress={handleVideoPress}
        style={styles.videoPressable}
      >
        <View style={styles.videoWrapper} pointerEvents="none">
          {useMuxPlayer ? (
            video.masterPlaylistUrl ? (
              <MuxPlayer
                ref={muxPlayerRef}
                src={video.masterPlaylistUrl}
                streamType="on-demand"
                autoPlay={isActive && isPlaying}
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
                autoPlay={isActive && isPlaying}
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
        </View>
        
        {/* Overlay de pausa - fuera del videoWrapper para que no interfiera */}
        {!isPlaying && (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <IconSymbol
              ios_icon_name="play.fill"
              android_material_icon_name="play-arrow"
              size={64}
              color="rgba(255, 255, 255, 0.8)"
            />
          </View>
        )}
        
        {/* Animación de like */}
        {showLikeAnimation && (
          <View style={styles.likeAnimationOverlay} pointerEvents="none">
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={100}
              color={colors.like}
            />
          </View>
        )}
        
        {/* Overlay de procesamiento */}
        {video.status === 'processing' && (
          <View style={styles.processingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.purple} />
            <Text style={styles.processingText}>Processing video...</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.leftContainer} pointerEvents="box-none">
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

      <View style={styles.rightContainer} pointerEvents="box-none">
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
  // FIX: Nuevo estilo para el Pressable que cubre todo
  videoPressable: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
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
    zIndex: 2,
  },
  likeAnimationOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 3,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 4,
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
    zIndex: 10,
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
    zIndex: 10,
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