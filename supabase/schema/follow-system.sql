
-- ============================================
-- VYXO Follow System Database Schema
-- ============================================
-- This script creates tables for follows, notifications, saves, reports, and blocks
-- with Row Level Security (RLS) policies and performance indexes

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ADD PUSH_TOKEN TO PROFILES TABLE
-- ============================================
-- Add push_token column to existing profiles table for push notifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add follower/following count columns if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- ============================================
-- 2. CREATE FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent users from following themselves
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    
    -- Prevent duplicate follows
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- ============================================
-- 3. CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Recipient
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Who triggered the notification
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention')),
    video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CREATE SAVES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.saves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate saves
    CONSTRAINT unique_save UNIQUE (user_id, video_id)
);

-- ============================================
-- 5. CREATE REPORTS TABLE
-- ============================================
-- Create enums for report types and statuses
DO $$ BEGIN
    CREATE TYPE public.target_type_enum AS ENUM ('video', 'user', 'comment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.report_status_enum AS ENUM ('pending', 'reviewed', 'resolved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- ID of the reported item (video, user, or comment)
    target_type target_type_enum NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status report_status_enum DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. CREATE BLOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent users from blocking themselves
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id),
    
    -- Prevent duplicate blocks
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES FOR FOLLOWS TABLE
-- ============================================
-- Users can view follows where they are either the follower or being followed
CREATE POLICY "Users can view their own follows" ON public.follows
FOR SELECT USING (
    follower_id = auth.uid() OR following_id = auth.uid()
);

-- Users can only create follows where they are the follower
CREATE POLICY "Users can insert their own follows" ON public.follows
FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Users can only delete their own follows
CREATE POLICY "Users can delete their own follows" ON public.follows
FOR DELETE USING (follower_id = auth.uid());

-- ============================================
-- 9. RLS POLICIES FOR NOTIFICATIONS TABLE
-- ============================================
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

-- System can insert notifications (for backend triggers)
CREATE POLICY "System can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 10. RLS POLICIES FOR SAVES TABLE
-- ============================================
-- Users can view their own saves
CREATE POLICY "Users can view their own saves" ON public.saves
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own saves
CREATE POLICY "Users can insert their own saves" ON public.saves
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own saves
CREATE POLICY "Users can delete their own saves" ON public.saves
FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 11. RLS POLICIES FOR REPORTS TABLE
-- ============================================
-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON public.reports
FOR SELECT USING (reporter_id = auth.uid());

-- Users can insert their own reports
CREATE POLICY "Users can insert their own reports" ON public.reports
FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Note: Admin policies for managing reports should be added separately
-- based on your admin role implementation

-- ============================================
-- 12. RLS POLICIES FOR BLOCKS TABLE
-- ============================================
-- Users can view blocks where they are the blocker or blocked
CREATE POLICY "Users can view their own blocks" ON public.blocks
FOR SELECT USING (
    blocker_id = auth.uid() OR blocked_id = auth.uid()
);

-- Users can insert their own blocks
CREATE POLICY "Users can insert their own blocks" ON public.blocks
FOR INSERT WITH CHECK (blocker_id = auth.uid());

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete their own blocks" ON public.blocks
FOR DELETE USING (blocker_id = auth.uid());

-- ============================================
-- 13. PERFORMANCE INDEXES
-- ============================================
-- Indexes for follows table
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows (created_at DESC);

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Indexes for saves table
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON public.saves (user_id);
CREATE INDEX IF NOT EXISTS idx_saves_video_id ON public.saves (video_id);
CREATE INDEX IF NOT EXISTS idx_saves_created_at ON public.saves (created_at DESC);

-- Indexes for reports table
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_id ON public.reports (target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports (created_at DESC);

-- Indexes for blocks table
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks (blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_created_at ON public.blocks (created_at DESC);

-- ============================================
-- 14. TRIGGER TO AUTO-UPDATE FOLLOWER/FOLLOWING COUNTS
-- ============================================
-- Function to update follower/following counts in profiles table
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment following_count for the follower
        UPDATE public.profiles
        SET following_count = following_count + 1
        WHERE id = NEW.follower_id;

        -- Increment followers_count for the user being followed
        UPDATE public.profiles
        SET followers_count = followers_count + 1
        WHERE id = NEW.following_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement following_count for the follower
        UPDATE public.profiles
        SET following_count = GREATEST(following_count - 1, 0)
        WHERE id = OLD.follower_id;

        -- Decrement followers_count for the user being unfollowed
        UPDATE public.profiles
        SET followers_count = GREATEST(followers_count - 1, 0)
        WHERE id = OLD.following_id;
        
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on follows table
DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.follows;
CREATE TRIGGER trg_update_follow_counts
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- ============================================
-- 15. HELPER FUNCTIONS (OPTIONAL)
-- ============================================
-- Function to check if user A is following user B
CREATE OR REPLACE FUNCTION public.is_following(follower_uuid UUID, following_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = follower_uuid AND following_id = following_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION public.is_blocked(blocker_uuid UUID, blocked_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.blocks
        WHERE blocker_id = blocker_uuid AND blocked_id = blocked_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SCHEMA CREATION COMPLETE
-- ============================================
-- Run this script in your Supabase SQL Editor
-- All tables, policies, indexes, and triggers are now set up
-- 
-- Next steps:
-- 1. Verify all tables were created: Check Supabase Table Editor
-- 2. Test RLS policies: Try inserting/querying data as different users
-- 3. Monitor performance: Check query execution times with indexes
-- 4. Integrate with backend: Create API endpoints for follow/unfollow, save, report, block
