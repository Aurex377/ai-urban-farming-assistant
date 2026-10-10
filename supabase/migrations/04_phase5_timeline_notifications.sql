-- ====================================================================
-- GrowWise AI — Phase 5: Plant Health Timeline & Notifications Migration
-- Additive & Non-Destructive Migration for Supabase PostgreSQL
-- ====================================================================

-- 1. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    plant_id BIGINT REFERENCES public.plants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'watering_due', 'disease_warning', 'extreme_weather', 'care_action', 'system'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'urgent', 'success'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast user queries and badge counts
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created 
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications (user_id, is_read) 
    WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_plant_id 
    ON public.notifications (plant_id);

-- 3. Row Level Security for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
    ) THEN
        CREATE POLICY "Users can view own notifications" ON public.notifications
            FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
    ) THEN
        CREATE POLICY "Users can update own notifications" ON public.notifications
            FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL)
            WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;
END $$;
