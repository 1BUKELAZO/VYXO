
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import ReportSheet from '@/components/ReportSheet';
import VideoReplyButton from '@/components/VideoReplyButton';
import VideoReplyList from '@/components/VideoReplyList';
import { useVideoReplies } from '@/hooks/useVideoReplies';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';

interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  repliesCount: number;
  createdAt: string;
  replies?: Comment[];
}

type TabType = 'comments' | 'videoReplies';

export default function CommentsScreen() {
  const { videoId, videoAuthorUsername, tab } = useLocalSearchParams<{ 
    videoId: string;
    videoAuthorUsername?: string;
    tab?: string;
  }>();
  
  const initialTab: TabType = tab === 'videoReplies' ? 'videoReplies' : 'comments';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [commentToReport, setCommentToReport] = useState<Comment | null>(null);

  const inputRef = useRef<TextInput>(null);
  
  // Video replies hook
  const {
    replies,
    loading: repliesLoading,
    error: repliesError,
    replyCount,
    fetchVideoReplies,
  } = useVideoReplies(videoId);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const fetchComments = useCallback(async () => {
    try {
      console.log('[API] Fetching comments for video:', videoId);
      const response = await authenticatedGet<Comment[]>(`/api/videos/${videoId}/comments`);
      console.log('[API] Fetched comments:', response.length);
      setComments(response);
    } catch (error) {
      console.error('[API] Error fetching comments:', error);
      showToast('Failed to load comments', 'error');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      console.log('[API] Submitting comment:', commentText, 'Reply to:', replyingTo?.id);
      await authenticatedPost(`/api/videos/${videoId}/comments`, {
        content: commentText,
        parentCommentId: replyingTo?.id,
      });
      
      showToast('Comment posted!', 'success');
      setCommentText('');
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      console.error('[API] Error posting comment:', error);
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    try {
      console.log('[API] Toggling like for comment:', commentId);
      
      // Optimistic update
      const updateComments = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            const newLikesCount = isLiked ? comment.likesCount - 1 : comment.likesCount + 1;
            return {
              ...comment,
              isLiked: !isLiked,
              likesCount: newLikesCount,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateComments(comment.replies),
            };
          }
          return comment;
        });
      };
      
      setComments(updateComments(comments));

      if (isLiked) {
        const response = await authenticatedDelete<{ success: boolean; likesCount: number }>(
          `/api/comments/${commentId}/like`
        );
        console.log('[API] Unlike comment response:', response);
      } else {
        const response = await authenticatedPost<{ success: boolean; likesCount: number }>(
          `/api/comments/${commentId}/like`,
          {}
        );
        console.log('[API] Like comment response:', response);
      }
    } catch (error) {
      console.error('[API] Error toggling like:', error);
      // Revert on error
      const updateComments = (comments: Comment[]): Comment[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            const newLikesCount = isLiked ? comment.likesCount + 1 : comment.likesCount - 1;
            return {
              ...comment,
              isLiked: isLiked,
              likesCount: newLikesCount,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: updateComments(comment.replies),
            };
          }
          return comment;
        });
      };
      setComments(updateComments(comments));
      showToast('Failed to update like', 'error');
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      console.log('[API] Deleting comment:', commentToDelete);
      await authenticatedDelete(`/api/comments/${commentToDelete}`);
      
      showToast('Comment deleted', 'success');
      setDeleteModalVisible(false);
      setCommentToDelete(null);
      fetchComments();
    } catch (error) {
      console.error('[API] Error deleting comment:', error);
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const timeAgo = formatTimeAgo(comment.createdAt);
    
    return (
      <View key={comment.id} style={[styles.commentContainer, isReply && styles.replyContainer]}>
        <View style={styles.commentAvatar}>
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={isReply ? 28 : 32}
            color={colors.textSecondary}
          />
        </View>
        
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{comment.username}</Text>
            <Text style={styles.commentTime}>{timeAgo}</Text>
          </View>
          
          <Text style={styles.commentText}>{comment.content}</Text>
          
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.commentAction}
              onPress={() => handleLikeComment(comment.id, comment.isLiked)}
            >
              <IconSymbol
                ios_icon_name={comment.isLiked ? 'heart.fill' : 'heart'}
                android_material_icon_name={comment.isLiked ? 'favorite' : 'favorite-border'}
                size={16}
                color={comment.isLiked ? colors.secondary : colors.textSecondary}
              />
              <Text style={[styles.commentActionText, comment.isLiked && styles.commentActionTextActive]}>
                {comment.likesCount}
              </Text>
            </TouchableOpacity>
            
            {!isReply && (
              <TouchableOpacity
                style={styles.commentAction}
                onPress={() => handleReply(comment)}
              >
                <IconSymbol
                  ios_icon_name="bubble.left"
                  android_material_icon_name="chat-bubble-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.commentAction}
              onPress={() => {
                setCommentToDelete(comment.id);
                setDeleteModalVisible(true);
              }}
            >
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.commentAction}
              onPress={() => {
                setCommentToReport(comment);
                setShowReportSheet(true);
              }}
            >
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="report"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          
          {comment.replies && comment.replies.length > 0 && (
            <View style={styles.repliesContainer}>
              {comment.replies.map(reply => renderComment(reply, true))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const placeholderText = replyingTo ? `Reply to ${replyingTo.username}...` : 'Add a comment...';
  const commentsTabText = 'Comments';
  const videoRepliesTabText = 'Video Replies';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Comments',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
          onPress={() => setActiveTab('comments')}
        >
          <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
            {commentsTabText}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videoReplies' && styles.tabActive]}
          onPress={() => setActiveTab('videoReplies')}
        >
          <Text style={[styles.tabText, activeTab === 'videoReplies' && styles.tabTextActive]}>
            {videoRepliesTabText}
          </Text>
          {replyCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{replyCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {activeTab === 'comments' ? (
          <>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderComment(item)}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
                }
              />
            )}

            {replyingTo && (
              <View style={styles.replyingToBar}>
                <Text style={styles.replyingToText}>Replying to {replyingTo.username}</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={placeholderText}
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <IconSymbol
                    ios_icon_name="paperplane.fill"
                    android_material_icon_name="send"
                    size={24}
                    color={colors.text}
                  />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.videoRepliesContainer}>
            <VideoReplyButton 
              videoId={videoId} 
              videoAuthorUsername={videoAuthorUsername || 'user'} 
            />
            
            <VideoReplyList
              replies={replies}
              loading={repliesLoading}
              error={repliesError}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        type="confirm"
        onConfirm={handleDeleteComment}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ReportSheet
        isVisible={showReportSheet}
        onClose={() => {
          setShowReportSheet(false);
          setCommentToReport(null);
        }}
        targetId={commentToReport?.id || ''}
        targetType="comment"
        targetName={commentToReport?.username}
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
  headerButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  commentsList: {
    padding: 15,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  replyContainer: {
    marginLeft: 20,
    marginTop: 10,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  commentTime: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  commentText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  commentActionTextActive: {
    color: colors.secondary,
  },
  repliesContainer: {
    marginTop: 10,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyingToText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  videoRepliesContainer: {
    flex: 1,
  },
});
