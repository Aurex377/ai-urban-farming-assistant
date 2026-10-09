-- ====================================================================
-- GrowWise AI — Phase 1: Database Schema Migration
-- Compatible with Supabase PostgreSQL
-- Non-destructive additive migration
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garden Zones Table
CREATE TABLE IF NOT EXISTS public.garden_zones (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    sunlight_level VARCHAR(50), -- 'full_sun', 'partial_sun', 'shade'
    indoor_or_outdoor VARCHAR(20) DEFAULT 'outdoor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhance Plants Table (Additive)
ALTER TABLE public.plants
    ADD COLUMN IF NOT EXISTS garden_zone_id BIGINT REFERENCES public.garden_zones(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS variety VARCHAR(100),
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS health_status VARCHAR(50) DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS health_score NUMERIC DEFAULT 100,
    ADD COLUMN IF NOT EXISTS last_watered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_watering_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill name from plant_name if plant_name exists and name is NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'plants' AND column_name = 'plant_name'
    ) THEN
        UPDATE public.plants SET name = plant_name WHERE name IS NULL AND plant_name IS NOT NULL;
    END IF;
END $$;

-- 4. Enhance Plant Images Table (Additive)
ALTER TABLE public.plant_images
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS public_url_or_signed_url TEXT,
    ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS upload_status VARCHAR(50) DEFAULT 'uploaded',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill storage_path from image_url if image_url exists and storage_path is NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'plant_images' AND column_name = 'image_url'
    ) THEN
        UPDATE public.plant_images SET storage_path = image_url WHERE storage_path IS NULL AND image_url IS NOT NULL;
    END IF;
END $$;

-- 5. Enhance Diagnoses Table (Additive)
ALTER TABLE public.diagnoses
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS symptoms TEXT,
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(50),
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(100) DEFAULT 'Local LLaVA Plant Disease 7B',
    ADD COLUMN IF NOT EXISTS raw_result JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set default status on existing rows if any
UPDATE public.diagnoses SET status = 'pending' WHERE status IS NULL;

-- 6. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access own plants') THEN
        CREATE POLICY "Users can access own plants" ON public.plants
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access own plant images') THEN
        CREATE POLICY "Users can access own plant images" ON public.plant_images
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access own diagnoses') THEN
        CREATE POLICY "Users can access own diagnoses" ON public.diagnoses
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
