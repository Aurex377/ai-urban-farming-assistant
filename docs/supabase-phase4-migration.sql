-- ====================================================================
-- GrowWise AI — Phase 4: NVIDIA Nemotron Personalization Migration
-- Additive migration for Supabase PostgreSQL
-- ====================================================================

ALTER TABLE public.care_recommendations
    ADD COLUMN IF NOT EXISTS structured_guidance JSONB,
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(100) DEFAULT 'NVIDIA Nemotron',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_care_recommendations_plant_id
    ON public.care_recommendations(plant_id, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view care recommendations') THEN
        CREATE POLICY "Users can view care recommendations" ON public.care_recommendations
            FOR SELECT USING (true);
    END IF;
END $$;
