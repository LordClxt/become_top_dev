package service

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"hash/fnv"
	"math"
	"slices"
	"time"
)

// Règles de la boucle d'habitude : quêtes du jour, coffre, répétition espacée, semaine, bonus. Fonctions pures.

// Metric est la mesure du jour qui fait avancer une quête.
type Metric int

const (
	MetricLessons       Metric = iota // leçons terminées
	MetricExercises                   // exercices réussis (première réussite)
	MetricCleanExercise               // exercices réussis sans indice
	MetricAnswers                     // bonnes réponses (quiz et points de contrôle)
	MetricReviews                     // cartes révisées
	MetricRuns                        // exécutions de tests
	MetricGoal                        // XP d'apprentissage vers l'objectif (need = objectif)
)

type QuestDef struct {
	ID     string
	Family string // deux quêtes d'une même famille ne sont jamais proposées le même jour
	Title  string
	Metric Metric
	Need   int // 0 pour MetricGoal : l'objectif du jour
	XP     int
}

// QuestPool : chaque trio de familles différentes se boucle en 30 à 45 minutes.
var QuestPool = []QuestDef{
	{"lessons-1", "lessons", "Termine une leçon", MetricLessons, 1, 15},
	{"lessons-2", "lessons", "Termine deux leçons", MetricLessons, 2, 30},
	{"exercise-1", "exercise", "Réussis un exercice", MetricExercises, 1, 20},
	{"exercise-clean", "exercise", "Réussis un exercice sans dévoiler d'indice", MetricCleanExercise, 1, 25},
	{"answers-5", "answers", "Donne 5 bonnes réponses (quiz ou points de contrôle)", MetricAnswers, 5, 15},
	{"answers-10", "answers", "Donne 10 bonnes réponses (quiz ou points de contrôle)", MetricAnswers, 10, 25},
	{"review-10", "review", "Révise 10 cartes", MetricReviews, 10, 15},
	{"review-20", "review", "Révise 20 cartes", MetricReviews, 20, 25},
	{"runs-5", "runs", "Lance les tests 5 fois", MetricRuns, 5, 10},
	{"goal", "goal", "Atteins ton objectif du jour", MetricGoal, 0, 20},
}

// QuestsPerDay est le nombre de quêtes proposées chaque jour.
const QuestsPerDay = 3

func dayHash(uid int64, day time.Time, salt string) uint64 {
	h := fnv.New64a()
	fmt.Fprintf(h, "%d|%s|%s", uid, isoDate(day), salt)
	return h.Sum64()
}

// PickQuests tire QuestsPerDay quêtes de familles différentes parmi pool : stable dans la journée,
// différent d'un jour (ou d'un utilisateur) à l'autre. Moins de QuestsPerDay si pool n'a pas assez de familles.
func PickQuests(uid int64, day time.Time, pool []QuestDef) []QuestDef {
	ordered := slices.Clone(pool)
	slices.SortStableFunc(ordered, func(a, b QuestDef) int {
		ha, hb := dayHash(uid, day, a.ID), dayHash(uid, day, b.ID)
		switch {
		case ha < hb:
			return -1
		case ha > hb:
			return 1
		}
		return 0
	})
	out := []QuestDef{}
	families := map[string]bool{}
	for _, q := range ordered {
		if len(out) == QuestsPerDay {
			break
		}
		if !families[q.Family] {
			families[q.Family] = true
			out = append(out, q)
		}
	}
	return out
}

// ChestXP est le contenu du coffre du jour : 20 à 60 XP par pas de 5, fixé par (utilisateur, jour).
func ChestXP(uid int64, day time.Time) int { return 20 + 5*int(dayHash(uid, day, "chest")%9) }

// --- Leitner -----------------------------------------------------------------

// LeitnerIntervals : délai en jours avant la prochaine révision, pour les boîtes 1 à 5.
var LeitnerIntervals = [...]int{1, 2, 4, 8, 16}

const MaxBox = len(LeitnerIntervals)

// NextReview applique une note : known monte d'une boîte (5 au plus), review renvoie en boîte 1 demain.
// lapse indique un oubli (compté dans lapses).
func NextReview(box int, known bool, today time.Time) (newBox int, dueOn time.Time, lapse bool) {
	if !known {
		return 1, addDays(today, 1), true
	}
	newBox = min(max(box, 0)+1, MaxBox)
	return newBox, addDays(today, LeitnerIntervals[newBox-1]), false
}

// CardID est l'id public d'une carte : les ids de flashcards ne sont uniques que dans leur leçon.
func CardID(lessonID, cardID string) string { return lessonID + "/" + cardID }

// refMax est la longueur de xp_events.ref_id.
const refMax = 128

// datedRef construit la référence <date>/<id> d'un événement d'XP quotidien. Trop longue, l'id est remplacé
// par son SHA-256 tronqué (déterministe, donc toujours unique par jour).
func datedRef(day time.Time, id string) string {
	ref := isoDate(day) + "/" + id
	if len(ref) <= refMax {
		return ref
	}
	sum := sha256.Sum256([]byte(id))
	return isoDate(day) + "/#" + hex.EncodeToString(sum[:])
}

// --- Semaine -----------------------------------------------------------------

// WeekStart est le lundi de la semaine de day.
func WeekStart(day time.Time) time.Time { return addDays(day, -weekday(day)) }

// WeekDays renvoie les 7 jours, du lundi au dimanche, de la semaine de day.
func WeekDays(day time.Time) []time.Time {
	start := WeekStart(day)
	out := make([]time.Time, 7)
	for i := range out {
		out[i] = addDays(start, i)
	}
	return out
}

// LocalDay est le jour calendaire de t dans loc, à minuit UTC comme tous les jours du service.
func LocalDay(t time.Time, loc *time.Location) time.Time {
	y, m, d := t.In(loc).Date()
	return Date(y, m, d)
}

// --- Bonus -------------------------------------------------------------------

const (
	firstTryRatio = 0.2
	QuizPerfectXP = 10
)

// FirstTryXP est le bonus « du premier coup » : 20 % de l'XP de l'exercice, arrondi comme ExerciseXP.
func FirstTryXP(exerciseXP int) int {
	return int(math.RoundToEven(float64(exerciseXP) * firstTryRatio))
}
