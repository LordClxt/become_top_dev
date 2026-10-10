package relay

import (
	"slices"
	"testing"
)

func ids(jobs []Job) []string {
	out := make([]string, len(jobs))
	for i, j := range jobs {
		out[i] = j.ID
	}
	return out
}

func sample() []Job {
	return []Job{
		{ID: "a", Kind: "email", Priority: 1},
		{ID: "b", Kind: "resize", Priority: 5},
		{ID: "c", Kind: "email", Priority: 5},
		{ID: "d", Kind: "report", Priority: 3},
		{ID: "e", Kind: "email", Priority: 0},
	}
}

func TestM1IndexFindsJobs(t *testing.T) {
	byID, dups := Index(sample())
	if len(byID) != 5 || byID["d"].Kind != "report" {
		t.Errorf("Index : byID = %v", byID)
	}
	if len(dups) != 0 {
		t.Errorf("aucun doublon attendu, obtenu %v", dups)
	}
}

func TestM1IndexDuplicates(t *testing.T) {
	jobs := []Job{
		{ID: "x", Kind: "first"}, {ID: "y"}, {ID: "x", Kind: "second"}, {ID: "y"}, {ID: "x"},
	}
	byID, dups := Index(jobs)
	if byID["x"].Kind != "first" {
		t.Errorf("en cas de doublon, le premier job est gardé : obtenu %q", byID["x"].Kind)
	}
	if !slices.Equal(dups, []string{"x", "y"}) {
		t.Errorf("duplicates = %v, attendu [x y] (chaque ID une fois, ordre de première répétition)", dups)
	}
}

func TestM1IndexEmpty(t *testing.T) {
	byID, dups := Index(nil)
	if byID == nil {
		t.Error("byID doit être une map utilisable, même vide (pas nil)")
	}
	if len(dups) != 0 {
		t.Errorf("duplicates doit être vide, obtenu %v", dups)
	}
}

func TestM2ByKindKeepsOrder(t *testing.T) {
	groups := ByKind(sample())
	if !slices.Equal(ids(groups["email"]), []string{"a", "c", "e"}) {
		t.Errorf("email = %v, attendu [a c e] dans l'ordre d'arrivée", ids(groups["email"]))
	}
	if len(groups) != 3 {
		t.Errorf("3 types attendus, obtenu %d", len(groups))
	}
}

func TestM3BatchByPriorityStable(t *testing.T) {
	batch, rest := NextBatch(sample(), 3)
	if !slices.Equal(ids(batch), []string{"b", "c", "d"}) {
		t.Errorf("batch = %v, attendu [b c d] (priorité décroissante, ordre d'arrivée à égalité)", ids(batch))
	}
	if !slices.Equal(ids(rest), []string{"a", "e"}) {
		t.Errorf("rest = %v, attendu [a e] dans l'ordre d'origine", ids(rest))
	}
}

func TestM3BatchBounds(t *testing.T) {
	batch, rest := NextBatch(sample(), 0)
	if len(batch) != 0 || len(rest) != 5 {
		t.Errorf("n = 0 : batch=%v rest=%v", ids(batch), ids(rest))
	}
	batch, rest = NextBatch(sample(), 99)
	if len(batch) != 5 || len(rest) != 0 {
		t.Errorf("n trop grand : batch=%v rest=%v", ids(batch), ids(rest))
	}
}

func TestM3NoSharedMemory(t *testing.T) {
	queue := sample()
	batch, rest := NextBatch(queue, 2)
	restBefore := ids(rest)
	batch = append(batch, Job{ID: "intrus"})
	batch[0].ID = "modifié"
	if !slices.Equal(ids(rest), restBefore) {
		t.Errorf("modifier batch a changé rest : %v — ils ne doivent pas partager de mémoire", ids(rest))
	}
	if !slices.Equal(ids(queue), []string{"a", "b", "c", "d", "e"}) {
		t.Errorf("queue a été modifiée : %v", ids(queue))
	}
}
