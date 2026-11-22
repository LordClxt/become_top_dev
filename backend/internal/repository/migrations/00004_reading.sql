-- Reprise de lecture : la dernière section lue de chaque leçon, pour revenir exactement là où l'on s'est arrêté.

-- +goose Up
-- anchor = id du titre (## ou ###) en haut de l'écran ; progress = avancement de la lecture (0 à 1).
CREATE TABLE lesson_reading (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_id VARCHAR(200) NOT NULL,
    anchor VARCHAR(120) NOT NULL,
    progress REAL NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, lesson_id)
);

-- +goose Down
DROP TABLE lesson_reading;
