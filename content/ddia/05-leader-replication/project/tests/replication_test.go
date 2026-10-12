package lab

import (
	"errors"
	"testing"
)

func fill(l *Leader) {
	l.Put("a", "1")
	l.Put("b", "2")
	l.Put("a", "3")
	l.Delete("b")
	l.Put("c", "4")
}

// ---------- Jalon 1 ----------

func TestM1LeaderNumbersWrites(t *testing.T) {
	l := NewLeader()
	if got := l.Put("a", "1"); got != 1 {
		t.Fatalf("première écriture : LSN %d, attendu 1", got)
	}
	if got := l.Put("b", "2"); got != 2 {
		t.Fatalf("deuxième écriture : LSN %d, attendu 2", got)
	}
	if got := l.Delete("a"); got != 3 {
		t.Fatalf("suppression : LSN %d, attendu 3 (une suppression est aussi une entrée du log)", got)
	}
	if l.LastLSN() != 3 {
		t.Fatalf("LastLSN = %d, attendu 3", l.LastLSN())
	}
	if _, ok := l.Get("a"); ok {
		t.Fatal("a devrait être supprimé")
	}
	if v, _ := l.Get("b"); v != "2" {
		t.Fatalf("b = %q, attendu 2", v)
	}
}

func TestM1SinceReturnsACopy(t *testing.T) {
	l := NewLeader()
	fill(l)
	es, err := l.Since(2)
	if err != nil || len(es) != 3 || es[0].LSN != 3 || es[2].LSN != 5 {
		t.Fatalf("Since(2) = %+v, %v ; attendu les LSN 3, 4, 5", es, err)
	}
	es[0].Key = "zzz"
	again, _ := l.Since(2)
	if again[0].Key != "a" {
		t.Fatal("Since doit renvoyer une copie : modifier le résultat ne doit pas toucher le log du leader")
	}
	if none, err := l.Since(5); err != nil || len(none) != 0 {
		t.Fatalf("Since(dernier) = %+v, %v ; attendu rien", none, err)
	}
}

func TestM1FollowerAppliesInOrder(t *testing.T) {
	l := NewLeader()
	fill(l)
	f := NewFollower()
	es, _ := l.Since(0)
	for _, e := range es {
		if err := f.Apply(e); err != nil {
			t.Fatal(err)
		}
	}
	if f.AppliedLSN() != 5 {
		t.Fatalf("AppliedLSN = %d, attendu 5", f.AppliedLSN())
	}
	if v, _ := f.Get("a"); v != "3" {
		t.Errorf("a = %q, attendu 3", v)
	}
	if _, ok := f.Get("b"); ok {
		t.Error("b devrait être supprimé sur le follower aussi")
	}
}

func TestM1FollowerRejectsAGap(t *testing.T) {
	f := NewFollower()
	err := f.Apply(Entry{LSN: 2, Key: "a", Value: "1"})
	if !errors.Is(err, ErrGap) {
		t.Fatalf("Apply(LSN 2 sur un follower vide) = %v, attendu ErrGap", err)
	}
	if f.AppliedLSN() != 0 {
		t.Fatal("une entrée refusée ne doit rien modifier")
	}
	if _, ok := f.Get("a"); ok {
		t.Fatal("une entrée refusée ne doit pas écrire")
	}
}

func TestM1ApplyIsIdempotent(t *testing.T) {
	f := NewFollower()
	e1 := Entry{LSN: 1, Key: "x", Value: "1"}
	e2 := Entry{LSN: 2, Key: "x", Value: "2"}
	if err := f.Apply(e1); err != nil {
		t.Fatal(err)
	}
	if err := f.Apply(e2); err != nil {
		t.Fatal(err)
	}
	if err := f.Apply(e1); err != nil {
		t.Fatalf("rejouer une entrée déjà vue doit être sans effet, pas une erreur : %v", err)
	}
	if v, _ := f.Get("x"); v != "2" {
		t.Fatalf("x = %q après rejeu, attendu 2 (le rejeu ne doit pas revenir en arrière)", v)
	}
	if f.AppliedLSN() != 2 {
		t.Fatalf("AppliedLSN = %d, attendu 2", f.AppliedLSN())
	}
}

func TestM1CatchUp(t *testing.T) {
	l := NewLeader()
	fill(l)
	f := NewFollower()
	es, _ := l.Since(0)
	f.Apply(es[0])
	f.Apply(es[1])
	n, err := f.CatchUp(l)
	if err != nil || n != 3 {
		t.Fatalf("CatchUp = %d, %v ; attendu 3 entrées appliquées", n, err)
	}
	if f.AppliedLSN() != 5 {
		t.Fatalf("AppliedLSN = %d, attendu 5", f.AppliedLSN())
	}
	if v, _ := f.Get("c"); v != "4" {
		t.Errorf("c = %q, attendu 4", v)
	}
	if n, _ := f.CatchUp(l); n != 0 {
		t.Errorf("un follower à jour n'a rien à rattraper, obtenu %d", n)
	}
}

// ---------- Jalon 2 ----------

func TestM2SnapshotIsConsistentCopy(t *testing.T) {
	l := NewLeader()
	l.Put("a", "1")
	l.Put("b", "2")
	l.Put("c", "3")
	snap, lsn := l.Snapshot()
	if lsn != 3 || len(snap) != 3 {
		t.Fatalf("Snapshot = %v @%d ; attendu 3 clés au LSN 3", snap, lsn)
	}
	l.Put("a", "changed")
	l.Put("d", "4")
	if snap["a"] != "1" || len(snap) != 3 {
		t.Fatal("l'instantané doit être une copie : les écritures suivantes du leader ne doivent pas y apparaître")
	}
}

func TestM2NewFollowerFromSnapshotThenCatchUp(t *testing.T) {
	l := NewLeader()
	l.Put("a", "1")
	l.Put("b", "2")
	l.Put("c", "3")
	snap, lsn := l.Snapshot()
	l.Put("a", "9") // pendant la copie, les clients continuent d'écrire
	l.Delete("b")
	f := NewFollowerFromSnapshot(snap, lsn)
	if f.AppliedLSN() != 3 {
		t.Fatalf("un follower issu d'un instantané démarre au LSN %d, obtenu %d", lsn, f.AppliedLSN())
	}
	n, err := f.CatchUp(l)
	if err != nil || n != 2 {
		t.Fatalf("CatchUp = %d, %v ; attendu 2 entrées (LSN 4 et 5)", n, err)
	}
	if v, _ := f.Get("a"); v != "9" {
		t.Errorf("a = %q, attendu 9", v)
	}
	if _, ok := f.Get("b"); ok {
		t.Error("b devrait être supprimé après le rattrapage")
	}
	if v, _ := f.Get("c"); v != "3" {
		t.Errorf("c = %q, attendu 3", v)
	}
	snap["zzz"] = "x" // le follower ne doit pas partager la map de l'instantané
	if _, ok := f.Get("zzz"); ok {
		t.Error("NewFollowerFromSnapshot doit copier l'instantané")
	}
}

func TestM2LagAndMostUpToDate(t *testing.T) {
	l := NewLeader()
	fill(l)
	f1, f2, f3 := NewFollower(), NewFollower(), NewFollower()
	f1.CatchUp(l)
	es, _ := l.Since(0)
	f2.Apply(es[0])
	f2.Apply(es[1])
	f3.Apply(es[0])
	f3.Apply(es[1])
	if Lag(l, f1) != 0 || Lag(l, f2) != 3 {
		t.Fatalf("Lag f1=%d f2=%d ; attendu 0 et 3", Lag(l, f1), Lag(l, f2))
	}
	if got := MostUpToDate([]*Follower{f2, f1, f3}); got != 1 {
		t.Errorf("MostUpToDate = %d, attendu 1 (f1 est le plus avancé)", got)
	}
	if got := MostUpToDate([]*Follower{f2, f3}); got != 0 {
		t.Errorf("à égalité, le plus petit indice : obtenu %d", got)
	}
	if got := MostUpToDate(nil); got != -1 {
		t.Errorf("aucun follower : attendu -1, obtenu %d", got)
	}
}

func TestM2FailoverKeepsNumberingAndFollowersResync(t *testing.T) {
	old := NewLeader()
	fill(old) // LSN 1..5
	f1, f2 := NewFollower(), NewFollower()
	es, _ := old.Since(0)
	for _, e := range es {
		f1.Apply(e)
	}
	f2.Apply(es[0])
	f2.Apply(es[1])
	// le leader tombe ; on promeut le follower le plus avancé
	best := MostUpToDate([]*Follower{f2, f1})
	if best != 1 {
		t.Fatalf("le candidat devrait être f1, obtenu l'indice %d", best)
	}
	nl := Promote(f1)
	if nl.LastLSN() != 5 {
		t.Fatalf("le nouveau leader repart du LSN %d, attendu 5", nl.LastLSN())
	}
	if lsn := nl.Put("z", "new"); lsn != 6 {
		t.Fatalf("première écriture du nouveau leader : LSN %d, attendu 6 (la numérotation continue)", lsn)
	}
	n, err := f2.CatchUp(nl)
	if err != nil || n != 4 {
		t.Fatalf("f2 doit se resynchroniser sur le nouveau leader : %d, %v (attendu 4 entrées, LSN 3 à 6)", n, err)
	}
	if v, _ := f2.Get("z"); v != "new" {
		t.Errorf("z = %q sur f2, attendu new", v)
	}
	if _, ok := f2.Get("b"); ok {
		t.Error("b supprimé au LSN 4 doit l'être aussi sur f2")
	}
}

func TestM2AsyncFailoverLosesWrites(t *testing.T) {
	old := NewLeader()
	fill(old)
	stale := NewFollower()
	es, _ := old.Since(0)
	stale.Apply(es[0])
	stale.Apply(es[1])
	if got := LostWrites(old.LastLSN(), stale); got != 3 {
		t.Fatalf("LostWrites = %d, attendu 3 (LSN 3, 4, 5 jamais reçus)", got)
	}
	nl := Promote(stale)
	if lsn := nl.Put("x", "y"); lsn != 3 {
		t.Fatalf("le nouveau leader réutilise le LSN 3 : obtenu %d (c'est exactement ce qui fait perdre des écritures confirmées)", lsn)
	}
	if got := LostWrites(2, stale); got != 0 {
		t.Errorf("rien de perdu si le follower a tout reçu : obtenu %d", got)
	}
}

func TestM2PromotedSnapshotFollowerCannotServeOldHistory(t *testing.T) {
	l := NewLeader()
	l.Put("a", "1")
	l.Put("b", "2")
	l.Put("c", "3")
	snap, lsn := l.Snapshot()
	f := NewFollowerFromSnapshot(snap, lsn)
	nl := Promote(f)
	if _, err := nl.Since(1); !errors.Is(err, ErrLogTruncated) {
		t.Fatalf("Since(1) sur un leader dont le log commence au LSN 3 : %v, attendu ErrLogTruncated", err)
	}
	if es, err := nl.Since(3); err != nil || len(es) != 0 {
		t.Fatalf("Since(3) = %v, %v ; attendu rien et pas d'erreur", es, err)
	}
	slow := NewFollower()
	if _, err := slow.CatchUp(nl); !errors.Is(err, ErrLogTruncated) {
		t.Fatalf("un follower vide ne peut pas se rattraper sur un log tronqué : %v (il lui faut un instantané)", err)
	}
}

// ---------- Jalon 3 ----------

func TestM3WriteRecordsLSNInSession(t *testing.T) {
	l := NewLeader()
	r := NewRouter(l, NewFollower())
	var s Session
	if lsn := r.Write(&s, "a", "1"); lsn != 1 || s.LastWrite != 1 {
		t.Fatalf("Write = %d, session %+v", lsn, s)
	}
	r.Write(&s, "a", "2")
	if s.LastWrite != 2 {
		t.Fatalf("LastWrite = %d, attendu 2", s.LastWrite)
	}
}

func TestM3ReadYourWrites(t *testing.T) {
	l := NewLeader()
	f := NewFollower() // jamais rattrapé : il est en retard
	r := NewRouter(l, f)
	var alice Session
	r.Write(&alice, "profile", "v2")
	v, ok := r.Read(&alice, "profile")
	if !ok || v != "v2" {
		t.Fatalf("Alice relit %q (%v) : elle doit voir sa propre écriture", v, ok)
	}
	if r.LeaderReads != 1 {
		t.Fatalf("le follower est en retard : la lecture devait aller au leader (LeaderReads=%d)", r.LeaderReads)
	}
	f.CatchUp(l)
	v, _ = r.Read(&alice, "profile")
	if v != "v2" || r.LeaderReads != 1 {
		t.Fatalf("follower rattrapé : lecture %q, LeaderReads=%d ; attendu v2 depuis le follower", v, r.LeaderReads)
	}
}

func TestM3OtherUsersCanReadStaleFollower(t *testing.T) {
	l := NewLeader()
	f := NewFollower()
	r := NewRouter(l, f)
	var alice, bob Session
	r.Write(&alice, "k", "new")
	if _, ok := r.Read(&bob, "k"); ok {
		t.Fatal("Bob n'a rien écrit : il peut lire le follower en retard (et ne rien voir)")
	}
	if r.LeaderReads != 0 {
		t.Fatalf("Bob n'a pas besoin du leader (LeaderReads=%d)", r.LeaderReads)
	}
}

func TestM3MonotonicReads(t *testing.T) {
	l := NewLeader()
	fast, slow := NewFollower(), NewFollower()
	l.Put("c", "hello")
	fast.CatchUp(l) // fast est au LSN 1, slow reste au LSN 0
	var bob Session
	// Bob lit d'abord sur fast (première réplique du routeur) : il voit le commentaire
	first := NewRouter(l, fast, slow)
	if v, ok := first.Read(&bob, "c"); !ok || v != "hello" {
		t.Fatalf("lecture sur fast = %q, %v", v, ok)
	}
	if bob.MinSeen != 1 {
		t.Fatalf("MinSeen = %d, attendu 1 : la session doit retenir le LSN observé", bob.MinSeen)
	}
	// Ensuite le routage envoie la requête vers slow en premier : slow ne doit plus servir Bob
	second := NewRouter(l, slow, fast)
	v, ok := second.Read(&bob, "c")
	if !ok || v != "hello" {
		t.Fatalf("Bob a déjà vu le commentaire : il ne doit pas le voir disparaître (lu %q, %v)", v, ok)
	}
	if second.LeaderReads != 0 {
		t.Fatalf("fast est assez avancé : pas besoin du leader (LeaderReads=%d)", second.LeaderReads)
	}
	// Plus aucun follower assez avancé : le leader prend le relais
	third := NewRouter(l, slow)
	if v, ok := third.Read(&bob, "c"); !ok || v != "hello" || third.LeaderReads != 1 {
		t.Fatalf("lecture %q, %v, LeaderReads=%d ; attendu hello depuis le leader", v, ok, third.LeaderReads)
	}
}

func TestM3FallsBackToLeaderWhenNoFollowerIsFreshEnough(t *testing.T) {
	l := NewLeader()
	f := NewFollower()
	l.Put("a", "1")
	f.CatchUp(l)
	r := NewRouter(l, f)
	var s Session
	r.Write(&s, "a", "2")
	v, _ := r.Read(&s, "a")
	if v != "2" || r.LeaderReads != 1 {
		t.Fatalf("lecture %q, LeaderReads=%d ; attendu 2 depuis le leader", v, r.LeaderReads)
	}
}
