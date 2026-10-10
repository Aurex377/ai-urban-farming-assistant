-- ====================================================================
-- GrowWise AI — Recommendations: User Preferences & Plant Favorites Migration
-- Additive & Non-Destructive Migration for Supabase PostgreSQL
-- ====================================================================

-- 1. User Plant Preferences Table
CREATE TABLE IF NOT EXISTS public.user_plant_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_plant_preferences_user UNIQUE (user_id)
);

-- 2. Plant Favorites Table
CREATE TABLE IF NOT EXISTS public.plant_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    plant_id VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_plant_favorites_user_plant UNIQUE (user_id, plant_id)
);

-- 3. Indexes for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_plant_preferences_user_id 
    ON public.user_plant_preferences (user_id);

CREATE INDEX IF NOT EXISTS idx_plant_favorites_user_id 
    ON public.plant_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_plant_favorites_plant_id 
    ON public.plant_favorites (plant_id);

-- 4. Row Level Security
ALTER TABLE public.user_plant_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_favorites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_plant_preferences' AND policyname = 'Users can manage own preferences'
    ) THEN
        CREATE POLICY "Users can manage own preferences" ON public.user_plant_preferences
            FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
            WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'plant_favorites' AND policyname = 'Users can manage own plant favorites'
    ) THEN
        CREATE POLICY "Users can manage own plant favorites" ON public.plant_favorites
            FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
            WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;
END $$;
