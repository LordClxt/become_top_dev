-- Schéma repris d'Alembic (révision a1b2c3d4e5f6). IF NOT EXISTS : une base existante est adoptée telle quelle.

-- +goose Up
CREATE TABLE IF NOT EXISTS xp_events (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(32) NOT NULL,
    ref_id VARCHAR(128) NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (kind, ref_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    lesson_id VARCHAR(128) PRIMARY KEY,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_progress (
    exercise_id VARCHAR(128) PRIMARY KEY,
    draft JSON,
    hints_revealed INTEGER NOT NULL,
    attempts INTEGER NOT NULL,
    passed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_runs (
    id SERIAL PRIMARY KEY,
    exercise_id VARCHAR(128) NOT NULL,
    passed BOOLEAN NOT NULL,
    duration_ms INTEGER NOT NULL,
    files JSON NOT NULL,
    report JSON NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_exercise_runs_exercise_id ON exercise_runs (exercise_id);

CREATE TABLE IF NOT EXISTS quiz_answers (
    id SERIAL PRIMARY KEY,
    quiz_id VARCHAR(128) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    answer JSON NOT NULL,
    correct BOOLEAN NOT NULL,
    first_attempt BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_quiz_answers_quiz_id ON quiz_answers (quiz_id);

CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY,
    avatar BYTEA,
    avatar_type VARCHAR(32),
    avatar_updated_at TIMESTAMPTZ
);

-- +goose Down
DROP TABLE IF EXISTS profile;
DROP TABLE IF EXISTS quiz_answers;
DROP TABLE IF EXISTS exercise_runs;
DROP TABLE IF EXISTS exercise_progress;
DROP TABLE IF EXISTS lesson_progress;
DROP TABLE IF EXISTS xp_events;
