package api

import (
	"net/http"
	"testing"
)

// « Continuer » suit l'ordre de la page du module : une leçon validée mène à son TP avant la leçon suivante.
func TestContinueAlternatesLessonAndLab(t *testing.T) {
	srv, _ := newTestServer(t)
	client := newClient(t)
	login(t, client, srv.URL)
	type today struct {
		Continue *struct {
			Type, ID, Label string
		}
	}
	get := func() today { return decode[today](t, do(t, client, http.MethodGet, srv.URL+"/api/today", nil)) }

	first := get().Continue
	if first == nil || first.Type != "lesson" {
		t.Fatalf("au départ, une leçon : %+v", first)
	}
	labs := loadContent(t).Lessons[first.ID].Labs
	if len(labs) == 0 {
		t.Skipf("la leçon %s n'a pas de TP", first.ID)
	}
	passLesson(t, client, srv.URL, first.ID)
	if c := get().Continue; c == nil || c.Type != "exercise" || c.ID != labs[0] || c.Label != "TP de la leçon" {
		t.Fatalf("après %s, son TP %s : %+v", first.ID, labs[0], c)
	}
}
