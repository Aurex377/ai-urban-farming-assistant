-- ====================================================================
-- GrowWise AI — Phase 2: Local LLaVA Vision Model Schema Enhancements
-- Compatible with Supabase PostgreSQL
-- Additive & Non-Destructive Migration
-- ====================================================================

-- 1. Ensure diagnoses columns exist with proper defaults
ALTER TABLE public.diagnoses
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS symptoms TEXT,
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(50),
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(100) DEFAULT 'Local LLaVA Plant Disease 7B',
    ADD COLUMN IF NOT EXISTS raw_result JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Performance indexes for plant history and status polling
CREATE INDEX IF NOT EXISTS idx_diagnoses_plant_id ON public.diagnoses (plant_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_status ON public.diagnoses (status);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created_at ON public.diagnoses (created_at DESC);

-- 3. Row Level Security Verification
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access own diagnoses') THEN
        CREATE POLICY "Users can access own diagnoses" ON public.diagnoses
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
