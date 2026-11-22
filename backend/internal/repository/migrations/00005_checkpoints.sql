-- Points de contrôle : essais, réponse révélée et réussite, par utilisateur.
-- Une leçon n'est validée qu'avec tous ses points de contrôle réussis, et une réponse révélée ne rapporte plus d'XP.

-- +goose Up
-- wrong = mauvaises réponses ; revealed = réponse demandée (après au moins un essai) ; solved_at = première réussite.
CREATE TABLE checkpoint_state (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_id VARCHAR(200) NOT NULL,
    checkpoint_id VARCHAR(100) NOT NULL,
    wrong INTEGER NOT NULL DEFAULT 0,
    revealed BOOLEAN NOT NULL DEFAULT false,
    solved_at TIMESTAMPTZ,
    PRIMARY KEY (user_id, lesson_id, checkpoint_id)
);

-- Les réussites passées, jusqu'ici déduites de l'XP (ref_id = « leçon/point »).
INSERT INTO checkpoint_state (user_id, lesson_id, checkpoint_id, solved_at)
SELECT user_id, split_part(ref_id, '/', 1), split_part(ref_id, '/', 2), created_at
FROM xp_events
WHERE kind = 'checkpoint' AND split_part(ref_id, '/', 2) <> ''
ON CONFLICT DO NOTHING;

-- +goose Down
DROP TABLE checkpoint_state;
