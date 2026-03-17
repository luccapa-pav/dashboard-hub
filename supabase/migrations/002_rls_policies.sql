-- ============================================================
-- Training Module — Row Level Security Policies
-- ============================================================

-- Enable RLS on all training tables
ALTER TABLE training_routines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_exercises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback             ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_measurements   ENABLE ROW LEVEL SECURITY;

-- ── training_routines ────────────────────────────────────────
CREATE POLICY "training_routines_select" ON training_routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "training_routines_insert" ON training_routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "training_routines_update" ON training_routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "training_routines_delete" ON training_routines
  FOR DELETE USING (auth.uid() = user_id);

-- ── training_exercises ───────────────────────────────────────
CREATE POLICY "training_exercises_select" ON training_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "training_exercises_insert" ON training_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "training_exercises_update" ON training_exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "training_exercises_delete" ON training_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- ── training_sessions ────────────────────────────────────────
CREATE POLICY "training_sessions_select" ON training_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "training_sessions_insert" ON training_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "training_sessions_update" ON training_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "training_sessions_delete" ON training_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ── exercise_sets ─────────────────────────────────────────────
CREATE POLICY "exercise_sets_select" ON exercise_sets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "exercise_sets_insert" ON exercise_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exercise_sets_update" ON exercise_sets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "exercise_sets_delete" ON exercise_sets
  FOR DELETE USING (auth.uid() = user_id);

-- ── cardio_logs ───────────────────────────────────────────────
CREATE POLICY "cardio_logs_select" ON cardio_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cardio_logs_insert" ON cardio_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cardio_logs_update" ON cardio_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cardio_logs_delete" ON cardio_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ── ai_feedback ───────────────────────────────────────────────
CREATE POLICY "ai_feedback_select" ON ai_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_feedback_insert" ON ai_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_feedback_delete" ON ai_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- ── physical_measurements ─────────────────────────────────────
CREATE POLICY "physical_measurements_select" ON physical_measurements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "physical_measurements_insert" ON physical_measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "physical_measurements_update" ON physical_measurements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "physical_measurements_delete" ON physical_measurements
  FOR DELETE USING (auth.uid() = user_id);
