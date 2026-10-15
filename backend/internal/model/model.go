// Package model décrit l'état de l'utilisateur stocké en base.
// Le contenu n'est jamais en base : on ne stocke que des références par id.
package model

import "time"

type ExerciseProgress struct {
	ExerciseID    string
	Draft         map[string]string // nil : pas de brouillon
	HintsRevealed int
	Attempts      int
	PassedAt      *time.Time
}

type ExerciseRun struct {
	ExerciseID string
	Passed     bool
	DurationMs int64
	Files      map[string]string
	Report     any
}

// QuizAnswer est une réponse donnée. La première tentative par question compte pour le score de maîtrise.
type QuizAnswer struct {
	QuizID       string
	QuestionID   string
	Answer       any
	Correct      bool
	FirstAttempt bool
}

// QuestionKey identifie une question de quiz.
type QuestionKey struct{ QuizID, QuestionID string }

// XPEvent est une attribution d'XP, avec le jour calendaire dans le fuseau demandé.
type XPEvent struct {
	Kind      string
	RefID     string
	Amount    int
	CreatedAt time.Time
	Day       time.Time
}

// DayCount regroupe les exécutions d'un TP ou les réponses d'un quiz sur une journée.
type DayCount struct {
	RefID string
	Day   time.Time
	Count int
	OK    int // exécutions réussies ou réponses correctes
	Last  time.Time
}

// Profile porte les réglages d'un utilisateur. L'avatar est petit, on le garde en base.
type Profile struct {
	Avatar          []byte
	AvatarType      string
	AvatarUpdatedAt *time.Time
}

// User est un compte. PasswordHash vide : compte du propriétaire pas encore réclamé.
type User struct {
	ID           int64
	Email        string
	DisplayName  string
	PasswordHash string
	IsAdmin      bool
	CreatedAt    time.Time
}

// Invite est un code d'invitation à usage unique.
type Invite struct {
	Code      string
	CreatedAt time.Time
	ExpiresAt time.Time
	UsedBy    *string // nom de la personne inscrite avec ce code
	UsedAt    *time.Time
}

// Member est un compte vu par l'admin, avec son XP totale.
type Member struct {
	ID          int64
	Email       string
	DisplayName string
	IsAdmin     bool
	CreatedAt   time.Time
	XP          int
}
