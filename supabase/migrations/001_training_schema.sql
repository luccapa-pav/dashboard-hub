-- ============================================================
-- Training Module — Schema (Fase 1)
-- ============================================================

-- Rotinas semanais
CREATE TABLE IF NOT EXISTS training_routines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  name          text NOT NULL,
  days          integer[] NOT NULL DEFAULT '{}',  -- [0-6] Sun-Sat
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Exercícios por rotina
CREATE TABLE IF NOT EXISTS training_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  routine_id    uuid NOT NULL REFERENCES training_routines(id) ON DELETE CASCADE,
  name          text NOT NULL,
  muscle_group  text,
  equipment     text,
  "order"       integer NOT NULL DEFAULT 0,
  default_sets  integer NOT NULL DEFAULT 3,
  default_reps  integer NOT NULL DEFAULT 12,
  default_weight_kg numeric(6,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Sessões diárias de treino
CREATE TABLE IF NOT EXISTS training_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  routine_id    uuid REFERENCES training_routines(id) ON DELETE SET NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  completed     boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Séries por exercício em cada sessão
CREATE TABLE IF NOT EXISTS exercise_sets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  session_id    uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES training_exercises(id) ON DELETE CASCADE,
  set_number    integer NOT NULL,
  reps          integer NOT NULL DEFAULT 0,
  weight_kg     numeric(6,2) NOT NULL DEFAULT 0,
  completed     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Cardio por sessão
CREATE TABLE IF NOT EXISTS cardio_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  session_id    uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  type          text NOT NULL,
  duration_min  integer NOT NULL DEFAULT 0,
  distance_km   numeric(6,2) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Feedbacks da IA (semanais)
CREATE TABLE IF NOT EXISTS ai_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  week_number   integer NOT NULL,
  year          integer NOT NULL,
  text          text NOT NULL,
  snapshot      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Medições físicas (Fase 3 preview)
CREATE TABLE IF NOT EXISTS physical_measurements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  measured_at   date NOT NULL DEFAULT current_date,
  weight_kg     numeric(5,2),
  body_fat_pct  numeric(4,1),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_training_sessions_user     ON training_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_routine  ON training_sessions(routine_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session      ON exercise_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise     ON exercise_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_cardio_logs_session        ON cardio_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_week      ON ai_feedback(user_id, year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_physical_measurements_user ON physical_measurements(user_id, measured_at DESC);
