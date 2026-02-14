import { pgTable, text, uuid, timestamp, integer, uniqueIndex, boolean, index, real, numeric, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

/**
 * VYXO - Short-form video social media app
 * Comprehensive database schema for videos, comments, messaging, notifications, and live streaming
 */

// Sounds table (defined first so videos can reference it)
export const sounds = pgTable(
  'sounds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    artistName: text('artist_name'),
    duration: real('duration').notNull(),
    fileUrl: text('file_url').notNull(),
    waveformUrl: text('waveform_url'),
    usageCount: integer('usage_count').notNull().default(0),
    trendingScore: real('trending_score').notNull().default(0),
    category: text('category'), // 'trending', 'viral', 'new', 'original'
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    isOriginal: boolean('is_original').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sounds_title_idx').on(table.title), // For sound title search
    index('sounds_trending_idx').on(table.trendingScore),
    index('sounds_usage_idx').on(table.usageCount),
    index('sounds_created_by_idx').on(table.createdBy),
  ]
);

// Videos table
export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    caption: text('caption'),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    sharesCount: integer('shares_count').notNull().default(0),
    viewsCount: integer('views_count').notNull().default(0),
    allowComments: boolean('allow_comments').notNull().default(true),
    allowDuets: boolean('allow_duets').notNull().default(true),
    allowStitches: boolean('allow_stitches').notNull().default(true),
    // Mux integration fields
    muxAssetId: text('mux_asset_id'),
    muxPlaybackId: text('mux_playback_id'),
    muxUploadId: text('mux_upload_id'),
    status: text('status').notNull().default('uploading'), // 'uploading', 'processing', 'ready', 'error'
    duration: integer('duration'), // duration in seconds
    aspectRatio: text('aspect_ratio'), // e.g., '9:16', '16:9'
    maxResolution: text('max_resolution'), // e.g., '1080p', '720p', '4k'
    masterPlaylistUrl: text('master_playlist_url'), // HLS master playlist URL
    muxThumbnailUrl: text('mux_thumbnail_url'), // Thumbnail from Mux
    gifUrl: text('gif_url'), // Animated GIF preview from Mux
    // Sound integration
    soundId: uuid('sound_id').references(() => sounds.id, { onDelete: 'set null' }),
    // Video replies
    parentVideoId: uuid('parent_video_id').references(() => videos.id, { onDelete: 'cascade' }),
    isReply: boolean('is_reply').notNull().default(false),
    videoRepliesCount: integer('video_replies_count').notNull().default(0),
    // Duets and stitches
    duetWithId: uuid('duet_with_id').references(() => videos.id, { onDelete: 'set null' }),
    isDuet: boolean('is_duet').notNull().default(false),
    isStitch: boolean('is_stitch').notNull().default(false),
    duetLayout: text('duet_layout').default('side'), // 'side' or 'top-bottom'
    duetsCount: integer('duets_count').notNull().default(0),
    // Trending score for algorithm
    scoreTrending: real('score_trending').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Index for efficient feed queries
    index('videos_caption_idx').on(table.caption), // For caption search
    index('videos_created_at_idx').on(table.createdAt), // For sorting by date
    index('videos_user_id_idx').on(table.userId), // For fetching user videos
    index('videos_views_count_idx').on(table.viewsCount), // For trending
    index('videos_score_trending_idx').on(table.scoreTrending), // For trending algorithm
    index('idx_videos_parent').on(table.parentVideoId), // For fetching video replies
    index('idx_videos_duet_with').on(table.duetWithId), // For fetching duets/stitches
  ]
);

// Video views table
export const videoViews = pgTable(
  'video_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Unique constraint: track unique views per user per video
    uniqueIndex('unique_video_user_view').on(table.videoId, table.userId),
    // Indexes for efficient queries
    index('video_views_video_id_idx').on(table.videoId),
    index('video_views_user_id_idx').on(table.userId),
    index('video_views_viewed_at_idx').on(table.viewedAt),
  ]
);

// Likes table
export const likes = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Unique constraint: user can only like a video once
    uniqueIndex('unique_user_video_like').on(table.userId, table.videoId),
    // Indexes for efficient queries
    index('likes_created_at_idx').on(table.createdAt),
  ]
);

// Follows table
export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: text('follower_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    followingId: text('following_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Unique constraint: follower can only follow a user once
    uniqueIndex('unique_follower_following').on(table.followerId, table.followingId),
  ]
);

// Relations for video views
export const videoViewsRelations = relations(videoViews, ({ one }) => ({
  video: one(videos, {
    fields: [videoViews.videoId],
    references: [videos.id],
  }),
  user: one(user, {
    fields: [videoViews.userId],
    references: [user.id],
  }),
}));

// Relations for sounds
export const soundsRelations = relations(sounds, ({ one, many }) => ({
  creator: one(user, {
    fields: [sounds.createdBy],
    references: [user.id],
  }),
  videos: many(videos),
}));

// Relations for videos
export const videosRelations = relations(videos, ({ one, many }) => ({
  author: one(user, {
    fields: [videos.userId],
    references: [user.id],
  }),
  sound: one(sounds, {
    fields: [videos.soundId],
    references: [sounds.id],
  }),
  parentVideo: one(videos, {
    fields: [videos.parentVideoId],
    references: [videos.id],
  }),
  replies: many(videos),
  duetWithVideo: one(videos, {
    fields: [videos.duetWithId],
    references: [videos.id],
  }),
  duets: many(videos),
  likes: many(likes),
}));

// Relations for likes
export const likesRelations = relations(likes, ({ one }) => ({
  video: one(videos, {
    fields: [likes.videoId],
    references: [videos.id],
  }),
  user: one(user, {
    fields: [likes.userId],
    references: [user.id],
  }),
}));

// Relations for follows
export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(user, {
    fields: [follows.followerId],
    references: [user.id],
  }),
  following: one(user, {
    fields: [follows.followingId],
    references: [user.id],
  }),
}));

// Comments table
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    parentCommentId: uuid('parent_comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

// Comment likes table
export const commentLikes = pgTable(
  'comment_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('unique_user_comment_like').on(table.commentId, table.userId)]
);

// Hashtags table
export const hashtags = pgTable(
  'hashtags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('hashtags_name_idx').on(table.name), // For hashtag search
    index('hashtags_usage_count_idx').on(table.usageCount), // For trending hashtags
  ]
);

// Video hashtags table (many-to-many relationship)
export const videoHashtags = pgTable(
  'video_hashtags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    hashtagId: uuid('hashtag_id').notNull().references(() => hashtags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_video_hashtag').on(table.videoId, table.hashtagId),
    index('video_hashtags_video_id_idx').on(table.videoId),
    index('video_hashtags_hashtag_id_idx').on(table.hashtagId),
  ]
);

// User followed hashtags table
export const userFollowedHashtags = pgTable(
  'user_followed_hashtags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    hashtagId: uuid('hashtag_id').notNull().references(() => hashtags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_user_hashtag').on(table.userId, table.hashtagId),
    index('user_followed_hashtags_user_id_idx').on(table.userId),
    index('user_followed_hashtags_hashtag_id_idx').on(table.hashtagId),
  ]
);

// Conversations table
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participant1: text('participant_1').notNull().references(() => user.id, { onDelete: 'cascade' }),
    participant2: text('participant_2').notNull().references(() => user.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_conversation').on(table.participant1, table.participant2),
    index('idx_conversations_participants').on(table.participant1, table.participant2),
  ]
);

// Messages table
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_messages_conversation').on(table.conversationId, table.createdAt),
    index('idx_messages_unread').on(table.conversationId, table.readAt),
  ]
);

// Notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'like', 'comment', 'follow', 'message'
    actorId: text('actor_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

// Live streams table
export const liveStreams = pgTable(
  'live_streams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    streamUrl: text('stream_url').notNull(),
    viewerCount: integer('viewer_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  }
);

// Live chat messages table
export const liveChatMessages = pgTable(
  'live_chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    streamId: uuid('stream_id').notNull().references(() => liveStreams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

// Relations for comments
export const commentsRelations = relations(comments, ({ one, many }) => ({
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  author: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
  }),
  replies: many(comments),
  likes: many(commentLikes),
}));

// Relations for comment likes
export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentLikes.commentId],
    references: [comments.id],
  }),
  user: one(user, {
    fields: [commentLikes.userId],
    references: [user.id],
  }),
}));

// Relations for video hashtags
export const videoHashtagsRelations = relations(videoHashtags, ({ one }) => ({
  video: one(videos, {
    fields: [videoHashtags.videoId],
    references: [videos.id],
  }),
  hashtag: one(hashtags, {
    fields: [videoHashtags.hashtagId],
    references: [hashtags.id],
  }),
}));

// Relations for user followed hashtags
export const userFollowedHashtagsRelations = relations(userFollowedHashtags, ({ one }) => ({
  user: one(user, {
    fields: [userFollowedHashtags.userId],
    references: [user.id],
  }),
  hashtag: one(hashtags, {
    fields: [userFollowedHashtags.hashtagId],
    references: [hashtags.id],
  }),
}));

// Relations for conversations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1User: one(user, {
    fields: [conversations.participant1],
    references: [user.id],
  }),
  participant2User: one(user, {
    fields: [conversations.participant2],
    references: [user.id],
  }),
  messages: many(messages),
}));

// Relations for messages
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(user, {
    fields: [messages.senderId],
    references: [user.id],
  }),
}));

// Relations for notifications
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  actor: one(user, {
    fields: [notifications.actorId],
    references: [user.id],
  }),
  video: one(videos, {
    fields: [notifications.videoId],
    references: [videos.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));

// Relations for live streams
export const liveStreamsRelations = relations(liveStreams, ({ one, many }) => ({
  streamer: one(user, {
    fields: [liveStreams.userId],
    references: [user.id],
  }),
  chatMessages: many(liveChatMessages),
}));

// Relations for live chat messages
export const liveChatMessagesRelations = relations(liveChatMessages, ({ one }) => ({
  stream: one(liveStreams, {
    fields: [liveChatMessages.streamId],
    references: [liveStreams.id],
  }),
  author: one(user, {
    fields: [liveChatMessages.userId],
    references: [user.id],
  }),
}));

// Reports table
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: text('reporter_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    targetId: text('target_id').notNull(),
    targetType: text('target_type').notNull(), // 'video', 'user', 'comment'
    reason: text('reason').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'), // 'pending', 'reviewed', 'resolved', 'dismissed'
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('reports_reporter_id_idx').on(table.reporterId),
    index('reports_target_id_idx').on(table.targetId),
    index('reports_status_idx').on(table.status),
  ]
);

// Blocks table
export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: text('blocker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    blockedId: text('blocked_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_blocker_blocked').on(table.blockerId, table.blockedId),
    index('blocks_blocker_id_idx').on(table.blockerId),
    index('blocks_blocked_id_idx').on(table.blockedId),
  ]
);

// Relations for reports
export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(user, {
    fields: [reports.reporterId],
    references: [user.id],
  }),
}));

// Relations for blocks
export const blocksRelations = relations(blocks, ({ one }) => ({
  blocker: one(user, {
    fields: [blocks.blockerId],
    references: [user.id],
  }),
  blocked: one(user, {
    fields: [blocks.blockedId],
    references: [user.id],
  }),
}));

// Creator applications table
export const creatorApplications = pgTable(
  'creator_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
    appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    paymentMethod: text('payment_method'), // 'paypal', 'bank_transfer', 'stripe'
    paymentDetails: jsonb('payment_details'),
  },
  (table) => [uniqueIndex('unique_creator_application').on(table.userId)]
);

// Creator earnings table
export const creatorEarnings = pgTable(
  'creator_earnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id').references(() => videos.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    source: text('source').notNull(), // 'views', 'gifts', 'tips'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('creator_earnings_user_id_idx').on(table.userId),
    index('creator_earnings_created_at_idx').on(table.createdAt),
  ]
);

// Creator withdrawals table
export const creatorWithdrawals = pgTable(
  'creator_withdrawals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
    paymentMethod: text('payment_method').notNull(),
    paymentDetails: jsonb('payment_details').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    notes: text('notes'),
  },
  (table) => [index('creator_withdrawals_user_id_idx').on(table.userId)]
);

// Relations for creator applications
export const creatorApplicationsRelations = relations(creatorApplications, ({ one }) => ({
  user: one(user, {
    fields: [creatorApplications.userId],
    references: [user.id],
  }),
}));

// Relations for creator earnings
export const creatorEarningsRelations = relations(creatorEarnings, ({ one }) => ({
  user: one(user, {
    fields: [creatorEarnings.userId],
    references: [user.id],
  }),
  video: one(videos, {
    fields: [creatorEarnings.videoId],
    references: [videos.id],
  }),
}));

// Relations for creator withdrawals
export const creatorWithdrawalsRelations = relations(creatorWithdrawals, ({ one }) => ({
  user: one(user, {
    fields: [creatorWithdrawals.userId],
    references: [user.id],
  }),
}));

// Gifts table
export const gifts = pgTable(
  'gifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    priceCoins: integer('price_coins').notNull(),
    valueCoins: integer('value_coins').notNull(),
    animationUrl: text('animation_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('gifts_price_coins_idx').on(table.priceCoins)]
);

// User coins table
export const userCoins = pgTable(
  'user_coins',
  {
    userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    totalSpent: integer('total_spent').notNull().default(0),
    totalEarned: integer('total_earned').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
);

// Gift transactions table
export const giftTransactions = pgTable(
  'gift_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    giftId: uuid('gift_id').notNull().references(() => gifts.id, { onDelete: 'restrict' }),
    videoId: uuid('video_id').references(() => videos.id, { onDelete: 'set null' }),
    amountCoins: integer('amount_coins').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('gift_transactions_sender_id_idx').on(table.senderId),
    index('gift_transactions_recipient_id_idx').on(table.recipientId),
    index('gift_transactions_created_at_idx').on(table.createdAt),
  ]
);

// Coin packages table
export const coinPackages = pgTable(
  'coin_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    coins: integer('coins').notNull(),
    priceUsd: numeric('price_usd', { precision: 10, scale: 2 }).notNull(),
    stripePriceId: text('stripe_price_id'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('coin_packages_is_active_idx').on(table.isActive)]
);

// Stripe transactions table
export const stripeTransactions = pgTable(
  'stripe_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    stripeSessionId: text('stripe_session_id').notNull().unique(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    packageId: uuid('package_id').notNull().references(() => coinPackages.id, { onDelete: 'restrict' }),
    coinsPurchased: integer('coins_purchased').notNull(),
    amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
    status: text('status').notNull().default('pending'), // pending, completed, failed, refunded
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('stripe_transactions_user_id_idx').on(table.userId),
    index('stripe_transactions_status_idx').on(table.status),
  ]
);

// Relations for user coins
export const userCoinsRelations = relations(userCoins, ({ one }) => ({
  user: one(user, {
    fields: [userCoins.userId],
    references: [user.id],
  }),
}));

// Relations for gift transactions
export const giftTransactionsRelations = relations(giftTransactions, ({ one }) => ({
  gift: one(gifts, {
    fields: [giftTransactions.giftId],
    references: [gifts.id],
  }),
  sender: one(user, {
    fields: [giftTransactions.senderId],
    references: [user.id],
  }),
  recipient: one(user, {
    fields: [giftTransactions.recipientId],
    references: [user.id],
  }),
  video: one(videos, {
    fields: [giftTransactions.videoId],
    references: [videos.id],
  }),
}));

// Relations for coin packages
export const coinPackagesRelations = relations(coinPackages, ({ many }) => ({
  stripeTransactions: many(stripeTransactions),
}));

// Relations for stripe transactions
export const stripeTransactionsRelations = relations(stripeTransactions, ({ one }) => ({
  user: one(user, {
    fields: [stripeTransactions.userId],
    references: [user.id],
  }),
  package: one(coinPackages, {
    fields: [stripeTransactions.packageId],
    references: [coinPackages.id],
  }),
}));

// Subscription tiers table
export const subscriptionTiers = pgTable(
  'subscription_tiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: text('creator_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    priceMonthly: integer('price_monthly').notNull(),
    benefits: text('benefits').array().notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('subscription_tiers_creator_id_idx').on(table.creatorId),
    index('subscription_tiers_is_active_idx').on(table.isActive),
  ]
);

// User subscriptions table
export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriberId: text('subscriber_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    creatorId: text('creator_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    tierId: uuid('tier_id').notNull().references(() => subscriptionTiers.id, { onDelete: 'restrict' }),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: text('status').notNull().default('active'), // active, canceled, expired, past_due
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('unique_subscriber_creator').on(table.subscriberId, table.creatorId),
    index('user_subscriptions_subscriber_id_idx').on(table.subscriberId),
    index('user_subscriptions_creator_id_idx').on(table.creatorId),
    index('user_subscriptions_status_idx').on(table.status),
  ]
);

// Stripe subscription events table
export const stripeSubscriptionEvents = pgTable(
  'stripe_subscription_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id').references(() => userSubscriptions.id, { onDelete: 'cascade' }),
    stripeEventId: text('stripe_event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    eventData: jsonb('event_data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stripe_subscription_events_subscription_id_idx').on(table.subscriptionId),
    index('stripe_subscription_events_stripe_event_id_idx').on(table.stripeEventId),
  ]
);

// Relations for subscription tiers
export const subscriptionTiersRelations = relations(subscriptionTiers, ({ one, many }) => ({
  creator: one(user, {
    fields: [subscriptionTiers.creatorId],
    references: [user.id],
  }),
  subscriptions: many(userSubscriptions),
}));

// Relations for user subscriptions
export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
  subscriber: one(user, {
    fields: [userSubscriptions.subscriberId],
    references: [user.id],
  }),
  creator: one(user, {
    fields: [userSubscriptions.creatorId],
    references: [user.id],
  }),
  tier: one(subscriptionTiers, {
    fields: [userSubscriptions.tierId],
    references: [subscriptionTiers.id],
  }),
  events: many(stripeSubscriptionEvents),
}));

// Relations for stripe subscription events
export const stripeSubscriptionEventsRelations = relations(stripeSubscriptionEvents, ({ one }) => ({
  subscription: one(userSubscriptions, {
    fields: [stripeSubscriptionEvents.subscriptionId],
    references: [userSubscriptions.id],
  }),
}));

// Ad campaigns table
export const adCampaigns = pgTable(
  'ad_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    advertiserId: text('advertiser_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    budget: numeric('budget', { precision: 10, scale: 2 }).notNull(),
    spent: numeric('spent', { precision: 10, scale: 2 }).notNull().default('0'),
    status: text('status').notNull().default('active'), // active, paused, completed
    targetAudience: jsonb('target_audience'),
    creativeUrl: text('creative_url').notNull(),
    ctaText: text('cta_text').notNull(),
    ctaUrl: text('cta_url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ad_campaigns_advertiser_id_idx').on(table.advertiserId),
    index('ad_campaigns_status_idx').on(table.status),
  ]
);

// Ad impressions table
export const adImpressions = pgTable(
  'ad_impressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => adCampaigns.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id').references(() => videos.id, { onDelete: 'set null' }),
    impressionAt: timestamp('impression_at', { withTimezone: true }).notNull().defaultNow(),
    clicked: boolean('clicked').notNull().default(false),
  },
  (table) => [
    index('ad_impressions_campaign_id_idx').on(table.campaignId),
    index('ad_impressions_user_id_idx').on(table.userId),
    index('ad_impressions_clicked_idx').on(table.clicked),
  ]
);

// Relations for ad campaigns
export const adCampaignsRelations = relations(adCampaigns, ({ one, many }) => ({
  advertiser: one(user, {
    fields: [adCampaigns.advertiserId],
    references: [user.id],
  }),
  impressions: many(adImpressions),
}));

// Relations for ad impressions
export const adImpressionsRelations = relations(adImpressions, ({ one }) => ({
  campaign: one(adCampaigns, {
    fields: [adImpressions.campaignId],
    references: [adCampaigns.id],
  }),
  user: one(user, {
    fields: [adImpressions.userId],
    references: [user.id],
  }),
  video: one(videos, {
    fields: [adImpressions.videoId],
    references: [videos.id],
  }),
}));

// Analytics events table for tracking user interactions with videos
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'view', 'like', 'comment', 'share', 'watch_time'
  eventData: jsonb('event_data'), // stores watch_time_seconds, traffic_source, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  videoIdIdx: index('analytics_events_video_id_idx').on(table.videoId),
  userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
  eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
}));

// Video retention data for tracking viewer drop-off over time
export const videoRetention = pgTable('video_retention', {
  id: uuid('id').primaryKey().defaultRandom(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  second: integer('second').notNull(), // second of video (0-based)
  viewersRemaining: integer('viewers_remaining').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  videoIdIdx: index('video_retention_video_id_idx').on(table.videoId),
  videoSecondUnique: uniqueIndex('video_retention_video_second_unique').on(table.videoId, table.second),
}));

// Relations for analytics events
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  video: one(videos, {
    fields: [analyticsEvents.videoId],
    references: [videos.id],
  }),
  user: one(user, {
    fields: [analyticsEvents.userId],
    references: [user.id],
  }),
}));

// Relations for video retention
export const videoRetentionRelations = relations(videoRetention, ({ one }) => ({
  video: one(videos, {
    fields: [videoRetention.videoId],
    references: [videos.id],
  }),
}));
