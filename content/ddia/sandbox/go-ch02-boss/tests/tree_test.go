package lab

import (
	"errors"
	"fmt"
	"math/rand"
	"slices"
	"sort"
	"testing"
)

func key(i int) string { return fmt.Sprintf("k%04d", i) }

// check vérifie les invariants d'un B+tree directement sur les pages du disque.
func check(t *testing.T, d *Disk, maxKeys int, want map[string]string) {
	t.Helper()
	reachable := map[PageID]bool{}
	leafDepth := -1
	got := map[string]string{}
	var walk func(id PageID, lo, hi string, hasHi bool, depth int)
	walk = func(id PageID, lo, hi string, hasHi bool, depth int) {
		if reachable[id] {
			t.Fatalf("page %d atteinte deux fois", id)
		}
		reachable[id] = true
		p, ok := d.ReadPage(id)
		if !ok {
			t.Fatalf("la page %d est référencée mais absente du disque : l'arbre est corrompu", id)
		}
		if len(p.Keys) > maxKeys {
			t.Fatalf("page %d : %d clés > maxKeys %d", id, len(p.Keys), maxKeys)
		}
		if !sort.StringsAreSorted(p.Keys) {
			t.Fatalf("page %d : clés non triées %v", id, p.Keys)
		}
		for _, k := range p.Keys {
			if k < lo || (hasHi && k >= hi) {
				t.Fatalf("page %d : la clé %q sort de l'intervalle [%q, %q) de son parent", id, k, lo, hi)
			}
		}
		if p.Leaf {
			if len(p.Vals) != len(p.Keys) {
				t.Fatalf("feuille %d : %d clés pour %d valeurs", id, len(p.Keys), len(p.Vals))
			}
			if leafDepth == -1 {
				leafDepth = depth
			} else if leafDepth != depth {
				t.Fatalf("feuilles à des profondeurs différentes (%d et %d) : arbre déséquilibré", leafDepth, depth)
			}
			for i, k := range p.Keys {
				got[k] = p.Vals[i]
			}
			return
		}
		if len(p.Children) != len(p.Keys)+1 {
			t.Fatalf("page interne %d : %d enfants pour %d clés", id, len(p.Children), len(p.Keys))
		}
		for i, c := range p.Children {
			clo, chi, chasHi := lo, hi, hasHi
			if i > 0 {
				clo = p.Keys[i-1]
			}
			if i < len(p.Keys) {
				chi, chasHi = p.Keys[i], true
			}
			walk(c, clo, chi, chasHi, depth+1)
		}
	}
	walk(d.Root(), "", "", false, 0)
	for _, id := range d.PageIDs() {
		if !reachable[id] {
			t.Fatalf("la page %d est orpheline : elle n'est l'enfant d'aucun parent", id)
		}
	}
	if len(got) != len(want) {
		t.Fatalf("l'arbre contient %d clés, attendu %d", len(got), len(want))
	}
	for k, v := range want {
		if got[k] != v {
			t.Fatalf("clé %q : %q, attendu %q", k, got[k], v)
		}
	}
}

func mustOpen(t *testing.T, d *Disk, maxKeys int) *Tree {
	t.Helper()
	tr, err := Open(d, maxKeys)
	if err != nil {
		t.Fatalf("Open : %v", err)
	}
	return tr
}

func TestBasicOperations(t *testing.T) {
	d := NewDisk()
	tr := mustOpen(t, d, 4)
	want := map[string]string{}
	for _, i := range rand.New(rand.NewSource(5)).Perm(300) {
		if err := tr.Put(key(i), fmt.Sprint(i)); err != nil {
			t.Fatal(err)
		}
		want[key(i)] = fmt.Sprint(i)
		if n := len(d.WAL()); n != 0 {
			t.Fatalf("après un Put réussi, le journal doit être effacé (%d batchs restants)", n)
		}
	}
	tr.Put(key(7), "remplacée")
	want[key(7)] = "remplacée"
	check(t, d, 4, want)
	for k, v := range want {
		if got, ok, err := tr.Get(k); err != nil || !ok || got != v {
			t.Fatalf("Get(%s) = %q, %v, %v", k, got, ok, err)
		}
	}
	if _, ok, _ := tr.Get("absente"); ok {
		t.Error("clé absente trouvée")
	}
	keys, _ := tr.Range(key(10), key(20))
	if len(keys) != 10 || keys[0] != key(10) || keys[9] != key(19) {
		t.Errorf("Range = %v", keys)
	}
	if all, _ := tr.Range("", ""); len(all) != 300 || !sort.StringsAreSorted(all) {
		t.Errorf("Range complet : %d clés", len(all))
	}
	if h, _ := tr.Height(); h < 4 || h > 9 {
		t.Errorf("Height = %d, hors de ce qu'on attend pour 300 clés à 4 par page", h)
	}
}

func TestPersistsAcrossReopen(t *testing.T) {
	d := NewDisk()
	tr := mustOpen(t, d, 5)
	want := map[string]string{}
	for i := 0; i < 100; i++ {
		tr.Put(key(i), fmt.Sprint(i))
		want[key(i)] = fmt.Sprint(i)
	}
	re := mustOpen(t, d, 5)
	if v, ok, _ := re.Get(key(42)); !ok || v != "42" {
		t.Errorf("après réouverture : %q, %v", v, ok)
	}
	check(t, d, 5, want)
	if len(mustOpen(t, NewDisk(), 5).d.PageIDs()) != 1 {
		t.Error("un arbre vide doit avoir une seule page (la racine feuille)")
	}
}

// Pour chaque point de crash possible pendant un Put (y compris ceux qui provoquent des éclatements en cascade),
// on redémarre et on vérifie que l'arbre est cohérent et contient la clé : le batch était déjà dans le journal.
func TestCrashAtEveryPointDuringAPut(t *testing.T) {
	for _, maxKeys := range []int{3, 4} {
		base := NewDisk()
		tr := mustOpen(t, base, maxKeys)
		want := map[string]string{}
		var sawCascade bool
		for i := 0; i < 60; i++ {
			// avant chaque insertion, teste tous les crashs possibles sur une copie du disque
			next := key(i*7 + 1000)
			for k := 0; k <= 12; k++ {
				d := base.Clone()
				victim := mustOpen(t, d, maxKeys)
				d.CrashAfter(k)
				err := victim.Put(next, "nouvelle")
				if err != nil {
					if !errors.Is(err, ErrCrash) {
						t.Fatalf("erreur inattendue : %v", err)
					}
					if len(d.WAL()) == 0 {
						t.Fatalf("maxKeys=%d, clé %d, crash après %d écritures : le journal est vide — le batch doit être journalisé AVANT les écritures de pages", maxKeys, i, k)
					}
					if k >= 3 {
						sawCascade = true
					}
				}
				d.Revive()
				re, err := Open(d, maxKeys)
				if err != nil {
					t.Fatalf("reprise après crash (k=%d) : %v", k, err)
				}
				if len(d.WAL()) != 0 {
					t.Fatalf("la reprise doit effacer le journal")
				}
				expected := copyMap(want)
				expected[next] = "nouvelle"
				check(t, d, maxKeys, expected)
				if v, ok, _ := re.Get(next); !ok || v != "nouvelle" {
					t.Fatalf("k=%d : la clé du Put interrompu est perdue (%q, %v) alors que son batch était journalisé", k, v, ok)
				}
			}
			tr.Put(key(i), fmt.Sprint(i))
			want[key(i)] = fmt.Sprint(i)
		}
		if !sawCascade {
			t.Error("le scénario de test n'a jamais provoqué d'éclatement multi-pages : test mal construit")
		}
	}
}

func copyMap(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func TestCrashDuringRecoveryItself(t *testing.T) {
	d := NewDisk()
	tr := mustOpen(t, d, 3)
	want := map[string]string{}
	for i := 0; i < 40; i++ {
		tr.Put(key(i), "v")
		want[key(i)] = "v"
	}
	// cherche une clé dont l'insertion éclate une page (au moins 2 écritures), pour que le rejeu demande plusieurs écritures
	splitKey := ""
	for i := 0; i < 50 && splitKey == ""; i++ {
		c := d.Clone()
		c.CrashAfter(1)
		if err := mustOpen(t, c, 3).Put(key(100+i), "dernier"); errors.Is(err, ErrCrash) {
			splitKey = key(100 + i)
		} else {
			tr.Put(key(100+i), "v")
			want[key(100+i)] = "v"
		}
	}
	if splitKey == "" {
		t.Fatal("test mal construit : aucune insertion n'éclate de page")
	}
	d.CrashAfter(1)
	if err := tr.Put(splitKey, "dernier"); !errors.Is(err, ErrCrash) {
		t.Fatalf("Put = %v, attendu ErrCrash", err)
	}
	want[splitKey] = "dernier"

	// premier redémarrage : la reprise elle-même plante au milieu du rejeu
	d.Revive()
	d.CrashAfter(1)
	if _, err := Open(d, 3); !errors.Is(err, ErrCrash) {
		t.Fatalf("Open pendant un crash = %v, attendu ErrCrash", err)
	}
	if len(d.WAL()) == 0 {
		t.Fatal("le journal ne doit pas être effacé tant que le rejeu n'est pas terminé")
	}
	// deuxième redémarrage : le rejeu est idempotent
	d.Revive()
	re := mustOpen(t, d, 3)
	check(t, d, 3, want)
	if v, ok, _ := re.Get(splitKey); !ok || v != "dernier" {
		t.Errorf("%s = %q, %v", splitKey, v, ok)
	}
}

func TestOperationsFailWhenTheDiskIsDown(t *testing.T) {
	d := NewDisk()
	tr := mustOpen(t, d, 4)
	tr.Put("a", "1")
	d.CrashAfter(0)
	if err := tr.Put("b", "2"); !errors.Is(err, ErrCrash) {
		t.Errorf("Put = %v", err)
	}
	if _, _, err := tr.Get("a"); !errors.Is(err, ErrCrash) {
		t.Errorf("Get sur un disque en panne = %v", err)
	}
	keys := slices.Clone([]string{"a", "b"})
	d.Revive()
	re := mustOpen(t, d, 4)
	for _, k := range keys {
		if _, ok, _ := re.Get(k); !ok {
			t.Errorf("%s manquante après reprise", k)
		}
	}
}
