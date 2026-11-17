-- Boucle d'habitude : objectif quotidien et répétition espacée (Leitner).
-- Les quêtes et le coffre n'ont pas de table : leur réclamation est un xp_events (kinds quest / chest).

-- +goose Up
ALTER TABLE profile ADD COLUMN daily_goal_xp INTEGER NOT NULL DEFAULT 50;

-- card_id = <lessonId>/<cardId> (les ids de carte ne sont uniques que dans une leçon).
-- box 1..5 : intervalles 1, 2, 4, 8, 16 jours. Pas de ligne : carte jamais révisée (boîte 0).
CREATE TABLE card_reviews (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    card_id VARCHAR(200) NOT NULL,
    box SMALLINT NOT NULL,
    due_on DATE NOT NULL,
    reviews INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- première révision : limite de nouvelles cartes par jour
    PRIMARY KEY (user_id, card_id)
);
CREATE INDEX ix_card_reviews_user_id_due_on ON card_reviews (user_id, due_on);

-- +goose Down
DROP TABLE card_reviews;
ALTER TABLE profile DROP COLUMN daily_goal_xp;
