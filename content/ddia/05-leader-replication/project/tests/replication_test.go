package lab

import (
	"errors"
	"fmt"
	"testing"
)

// fill écrit n clés k1..kn sur le leader et renvoie les entrées créées.
func fill(l *Leader, n int) []Entry {
	var out []Entry
	for i := 1; i <= n; i++ {
		out = append(out, l.Put(fmt.Sprintf("k%d", i), fmt.Sprintf("v%d", i)))
	}
	return out
}

// follower crée un follower vide (snapshot au LSN 0) et lui applique les n premières entrées.
func follower(t *testing.T, entries []Entry, n int) *Follower {
	t.Helper()
	f := NewFollower(Snapshot{Data: map[string]string{}, LSN: 0, Epoch: 1})
	if err := f.Apply(1, entries[:n]); err != nil {
		t.Fatalf("Apply de %d entrées contiguës : %v", n, err)
	}
	return f
}

// userOn trouve un identifiant d'utilisateur routé vers le réplica i parmi n.
func userOn(i, n int) string {
	for k := 0; ; k++ {
		if u := fmt.Sprintf("user-%d", k); ReplicaFor(u, n) == i {
			return u
		}
	}
}

// ---------- Jalon 1 ----------

func TestM1PutAssignsPositions(t *testing.T) {
	l := NewLeader(1)
	es := fill(l, 3)
	for i, e := range es {
		if e.LSN != uint64(i+1) || e.Epoch != 1 {
			t.Errorf("entrée %d = %+v, attendu LSN %d et époque 1 — chaque écriture prend la position suivante du log", i, e, i+1)
		}
	}
	if l.LastLSN() != 3 {
		t.Errorf("LastLSN() = %d, attendu 3", l.LastLSN())
	}
	if v, ok := l.Get("k2"); !ok || v != "v2" {
		t.Errorf("Get(k2) = %q, %v — le leader applique l'écriture localement", v, ok)
	}
}

func TestM1SinceReturnsACopy(t *testing.T) {
	l := NewLeader(1)
	fill(l, 3)
	got, err := l.Since(1)
	if err != nil || len(got) != 2 || got[0].LSN != 2 || got[1].LSN != 3 {
		t.Fatalf("Since(1) = %+v, %v ; attendu les entrées 2 et 3", got, err)
	}
	got[0].Value = "pirate"
	again, _ := l.Since(1)
	if again[0].Value != "v2" {
		t.Error("Since doit renvoyer une copie : modifier le résultat ne doit pas toucher le log du leader")
	}
	if empty, err := l.Since(3); err != nil || empty == nil || len(empty) != 0 {
		t.Errorf("Since(dernière position) = %v, %v ; attendu une slice vide non nil", empty, err)
	}
}

func TestM1SnapshotThenCatchUp(t *testing.T) {
	l := NewLeader(1)
	fill(l, 3)
	snap := l.Snapshot()
	if snap.LSN != 3 || len(snap.Data) != 3 {
		t.Fatalf("Snapshot = LSN %d, %d clés ; attendu LSN 3 et 3 clés", snap.LSN, len(snap.Data))
	}
	l.Put("k4", "v4")
	l.Put("k1", "v1-bis")
	if len(snap.Data) != 3 || snap.Data["k1"] != "v1" {
		t.Fatal("le snapshot doit être une copie : les écritures suivantes ne doivent pas le modifier")
	}
	f := NewFollower(snap)
	snap.Data["k2"] = "corrompu"
	if v, _ := f.Get("k2"); v != "v2" {
		t.Error("NewFollower doit copier les données du snapshot, pas les partager")
	}
	if f.Position() != 3 {
		t.Errorf("Position() = %d après snapshot, attendu 3 — le snapshot porte sa position dans le log", f.Position())
	}
	if err := f.CatchUp(l); err != nil {
		t.Fatalf("CatchUp : %v", err)
	}
	if f.Position() != 5 {
		t.Errorf("Position() = %d après rattrapage, attendu 5", f.Position())
	}
	if v, _ := f.Get("k1"); v != "v1-bis" {
		t.Errorf("Get(k1) = %q, attendu v1-bis — les changements s'appliquent dans l'ordre du log", v)
	}
}

func TestM1ApplyRules(t *testing.T) {
	l := NewLeader(2)
	es := fill(l, 5)
	cases := []struct {
		name    string
		epoch   uint64
		batch   []Entry
		wantErr error
		wantPos uint64
	}{
		{"entrées contiguës", 2, es[2:5], nil, 5},
		{"doublons ignorés (rejeu après crash)", 2, append(es[0:3], es[3]), nil, 4},
		{"trou dans le log", 2, []Entry{es[2], es[4]}, ErrGap, 3},
		{"leader d'une ancienne époque", 1, es[2:5], ErrStaleEpoch, 2},
		{"leader d'une époque plus récente", 3, es[2:3], nil, 3},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := NewFollower(Snapshot{Data: map[string]string{"k1": "v1", "k2": "v2"}, LSN: 2, Epoch: 2})
			err := f.Apply(c.epoch, c.batch)
			if !errors.Is(err, c.wantErr) {
				t.Errorf("Apply : err = %v, attendu %v", err, c.wantErr)
			}
			if f.Position() != c.wantPos {
				t.Errorf("Position() = %d, attendu %d — les entrées valides avant l'erreur restent appliquées", f.Position(), c.wantPos)
			}
		})
	}
}

// ---------- Jalon 2 ----------

func TestM2PromoteMostAdvanced(t *testing.T) {
	l := NewLeader(1)
	es := fill(l, 10)
	fs := []*Follower{follower(t, es, 4), follower(t, es, 9), follower(t, es, 7)}
	nl, idx, err := Promote(fs, 2)
	if err != nil {
		t.Fatal(err)
	}
	if idx != 1 {
		t.Errorf("Promote a choisi le follower %d, attendu 1 (LSN 9) — le plus avancé perd le moins d'écritures", idx)
	}
	if nl.Epoch() != 2 || nl.LastLSN() != 9 {
		t.Errorf("nouveau leader : époque %d, LastLSN %d ; attendu 2 et 9", nl.Epoch(), nl.LastLSN())
	}
	for i, f := range fs {
		if f.Epoch() != 2 {
			t.Errorf("follower %d : époque %d, attendu 2 — tous les followers apprennent la nouvelle époque", i, f.Epoch())
		}
	}
	nl.Put("k1", "nouveau")
	if v, _ := fs[1].Get("k1"); v != "v1" {
		t.Error("le nouveau leader doit avoir ses propres données : écrire sur lui ne doit pas modifier le follower promu")
	}
	_, tie, _ := Promote([]*Follower{follower(t, es, 6), follower(t, es, 6)}, 3)
	if tie != 0 {
		t.Errorf("à égalité de position, Promote doit choisir le premier, a choisi %d", tie)
	}
}

func TestM2PromoteErrors(t *testing.T) {
	if _, _, err := Promote(nil, 2); !errors.Is(err, ErrNoCandidate) {
		t.Errorf("aucun follower : err = %v, attendu ErrNoCandidate", err)
	}
	es := fill(NewLeader(1), 2)
	if _, _, err := Promote([]*Follower{follower(t, es, 2)}, 1); !errors.Is(err, ErrEpoch) {
		t.Errorf("époque 1 déjà connue : err = %v, attendu ErrEpoch — sans époque plus grande, rien ne distingue les deux leaders", err)
	}
}

func TestM2FailoverScenario(t *testing.T) {
	old := NewLeader(1)
	es := fill(old, 10)
	fs := []*Follower{follower(t, es, 4), follower(t, es, 9), follower(t, es, 7)}
	nl, _, _ := Promote(fs, 2)

	e := nl.Put("k10", "écrit après le failover")
	if e.LSN != 10 || e.Epoch != 2 {
		t.Errorf("première écriture du nouveau leader = %+v, attendu LSN 10, époque 2 — il reprend le log là où il s'arrêtait", e)
	}
	if err := fs[0].CatchUp(nl); err != nil || fs[0].Position() != 10 {
		t.Fatalf("le follower 0 rattrape le nouveau leader : position %d, err %v ; attendu 10", fs[0].Position(), err)
	}
	if v, _ := fs[0].Get("k10"); v != "écrit après le failover" {
		t.Errorf("Get(k10) = %q — le follower doit voir la version du nouveau leader", v)
	}

	old.Put("k11", "split brain")
	if err := fs[2].CatchUp(old); !errors.Is(err, ErrStaleEpoch) {
		t.Errorf("rattraper l'ancien leader : err = %v, attendu ErrStaleEpoch — l'époque 1 est périmée", err)
	}
	if fs[2].Position() != 7 {
		t.Errorf("Position() = %d, attendu 7 — aucune écriture de l'ancien leader ne doit être appliquée", fs[2].Position())
	}

	lost := LostWrites(old, 9)
	if len(lost) != 2 || lost[0].Key != "k10" || lost[0].Value != "v10" || lost[1].Key != "k11" {
		t.Errorf("LostWrites = %+v ; attendu les entrées 10 et 11 de l'ancien leader, jamais reçues par le nouveau", lost)
	}
}

func TestM2SnapshotNeeded(t *testing.T) {
	l := NewLeader(1)
	fill(l, 3)
	behind := NewFollower(l.Snapshot())
	fill(l, 2)
	fresh := NewFollower(l.Snapshot())
	nl, _, err := Promote([]*Follower{fresh}, 2)
	if err != nil {
		t.Fatal(err)
	}
	if err := behind.CatchUp(nl); !errors.Is(err, ErrSnapshotNeeded) {
		t.Errorf("follower au LSN 3, nouveau leader né d'un snapshot au LSN 5 : err = %v, attendu ErrSnapshotNeeded", err)
	}
}

// ---------- Jalon 3 ----------

func cluster(t *testing.T) (*Leader, []*Follower, *Router) {
	t.Helper()
	l := NewLeader(1)
	fs := []*Follower{NewFollower(l.Snapshot()), NewFollower(l.Snapshot())}
	return l, fs, NewRouter(l, fs)
}

func TestM3ReadYourWrites(t *testing.T) {
	l, fs, r := cluster(t)
	u := userOn(0, 2)
	r.Write(u, "photo", "nouvelle.jpg")
	if v, ok, src := r.Read(u, "photo"); !ok || v != "nouvelle.jpg" || src != -1 {
		t.Errorf("Read = %q, %v, source %d ; attendu nouvelle.jpg depuis le leader (-1) — son réplica n'a pas encore l'écriture", v, ok, src)
	}
	if err := fs[0].CatchUp(l); err != nil {
		t.Fatal(err)
	}
	if v, _, src := r.Read(u, "photo"); v != "nouvelle.jpg" || src != 0 {
		t.Errorf("après rattrapage : %q, source %d ; attendu le réplica 0 — inutile de charger le leader", v, src)
	}
}

func TestM3OthersMayReadStale(t *testing.T) {
	_, _, r := cluster(t)
	writer, reader := userOn(0, 2), userOn(1, 2)
	r.Write(writer, "post", "bonjour")
	if _, ok, src := r.Read(reader, "post"); ok || src != 1 {
		t.Errorf("un autre utilisateur lit sur son réplica (source %d, trouvé %v) ; attendu le réplica 1, encore sans le post — read-your-writes ne promet rien pour les écritures des autres", src, ok)
	}
}

func TestM3AffinityIsStable(t *testing.T) {
	_, _, r := cluster(t)
	u := userOn(1, 2)
	for i := 0; i < 5; i++ {
		if _, _, src := r.Read(u, "x"); src != 1 {
			t.Fatalf("lecture %d : source %d, attendu toujours 1 — un utilisateur lit toujours sur le même réplica", i, src)
		}
	}
}

func TestM3MonotonicReads(t *testing.T) {
	l, fs, r := cluster(t)
	u := userOn(0, 2)
	es := fill(l, 3)
	r.Write(u, "k1", "à moi")
	if _, _, src := r.Read(u, "k1"); src != -1 {
		t.Fatalf("source %d, attendu le leader : le réplica 0 n'a pas l'écriture", src)
	}
	if r.Seen(u) != 4 {
		t.Errorf("Seen = %d, attendu 4 — une lecture au leader fait avancer la position vue", r.Seen(u))
	}
	if err := fs[0].Apply(1, es); err != nil {
		t.Fatal(err)
	}
	if v, _, src := r.Read(u, "k1"); src != -1 || v != "à moi" {
		t.Errorf("réplica au LSN 3 < 4 : source %d, valeur %q ; attendu le leader — sinon l'utilisateur verrait le temps reculer", src, v)
	}
	if err := fs[0].CatchUp(l); err != nil {
		t.Fatal(err)
	}
	if _, _, src := r.Read(u, "k1"); src != 0 {
		t.Errorf("réplica rattrapé : source %d, attendu 0", src)
	}
}

func TestM3NoFollowers(t *testing.T) {
	l := NewLeader(1)
	r := NewRouter(l, nil)
	r.Write("ada", "k", "v")
	if v, ok, src := r.Read("ada", "k"); !ok || v != "v" || src != -1 {
		t.Errorf("sans follower : %q, %v, source %d ; attendu le leader", v, ok, src)
	}
}
