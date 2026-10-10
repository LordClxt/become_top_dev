package lab

import (
	"fmt"
	"slices"
	"testing"
	"time"
)

func mustGet(t *testing.T, c *Cache, key, want string) {
	t.Helper()
	if got, ok := Get(c, key); !ok || got != want {
		t.Errorf("Get(%q) = (%q, %v), attendu (%q, true)", key, got, ok, want)
	}
}

func mustMiss(t *testing.T, c *Cache, key string) {
	t.Helper()
	if got, ok := Get(c, key); ok {
		t.Errorf("Get(%q) = (%q, true), attendu une absence", key, got)
	}
}

func TestM1PutGetDelete(t *testing.T) {
	c := NewCache(10)
	mustMiss(t, c, "a")
	Put(c, "a", "1")
	Put(c, "b", "2")
	mustGet(t, c, "a", "1")
	mustGet(t, c, "b", "2")
	if Len(c) != 2 {
		t.Errorf("Len = %d, attendu 2", Len(c))
	}

	Put(c, "a", "10") // mise à jour
	mustGet(t, c, "a", "10")
	if Len(c) != 2 {
		t.Errorf("une mise à jour ne doit pas ajouter d'entrée : Len = %d", Len(c))
	}

	if !Delete(c, "a") || Delete(c, "a") || Delete(c, "zzz") {
		t.Errorf("Delete doit renvoyer true une seule fois pour une clé présente")
	}
	mustMiss(t, c, "a")
	mustGet(t, c, "b", "2")
	if Len(c) != 1 {
		t.Errorf("Len après suppression = %d", Len(c))
	}
	Delete(c, "b")
	if Len(c) != 0 {
		t.Errorf("cache vidé : Len = %d", Len(c))
	}
	Put(c, "c", "3")
	mustGet(t, c, "c", "3") // le cache reste utilisable après avoir été vidé
}

func TestM1EmptyValueIsStillAValue(t *testing.T) {
	c := NewCache(2)
	Put(c, "empty", "")
	if got, ok := Get(c, "empty"); !ok || got != "" {
		t.Errorf("une valeur vide est une valeur : (%q, %v)", got, ok)
	}
	if got, ok := Get(c, ""); ok {
		t.Errorf("la clé vide est absente : (%q, %v)", got, ok)
	}
	Put(c, "", "clé vide")
	mustGet(t, c, "", "clé vide")
}

func TestM1NilCacheIsSafe(t *testing.T) {
	var c *Cache
	Put(c, "a", "1")
	if _, ok := Get(c, "a"); ok {
		t.Errorf("Get sur un cache nil")
	}
	if _, ok := Peek(c, "a"); ok {
		t.Errorf("Peek sur un cache nil")
	}
	if Delete(c, "a") || Len(c) != 0 || len(Keys(c)) != 0 {
		t.Errorf("un cache nil se comporte comme un cache vide")
	}
	if h, m, e := Stats(c); h+m+e != 0 {
		t.Errorf("Stats(nil) = %d %d %d", h, m, e)
	}
}

func TestM2EvictsTheLeastRecentlyUsed(t *testing.T) {
	c := NewCache(2)
	Put(c, "a", "1")
	Put(c, "b", "2")
	Put(c, "c", "3") // a est la plus ancienne : évincée
	mustMiss(t, c, "a")
	mustGet(t, c, "b", "2")
	mustGet(t, c, "c", "3")
	if Len(c) != 2 {
		t.Errorf("Len = %d, attendu 2", Len(c))
	}
}

func TestM2GetRefreshesRecency(t *testing.T) {
	c := NewCache(2)
	Put(c, "a", "1")
	Put(c, "b", "2")
	mustGet(t, c, "a", "1") // a devient la plus récente
	Put(c, "c", "3")        // b est maintenant la plus ancienne
	mustMiss(t, c, "b")
	mustGet(t, c, "a", "1")
	mustGet(t, c, "c", "3")
}

func TestM2PutOfAnExistingKeyRefreshesWithoutEvicting(t *testing.T) {
	c := NewCache(2)
	Put(c, "a", "1")
	Put(c, "b", "2")
	Put(c, "a", "10") // le cache est plein mais la clé existe : aucune éviction, a devient la plus récente
	if Len(c) != 2 {
		t.Fatalf("Len = %d", Len(c))
	}
	Put(c, "c", "3") // évince b
	mustMiss(t, c, "b")
	mustGet(t, c, "a", "10")
}

func TestM2KeysFromMostToLeastRecent(t *testing.T) {
	c := NewCache(4)
	for _, k := range []string{"a", "b", "c", "d"} {
		Put(c, k, k)
	}
	if got := Keys(c); !slices.Equal(got, []string{"d", "c", "b", "a"}) {
		t.Errorf("Keys = %v, attendu [d c b a]", got)
	}
	Get(c, "b")
	if got := Keys(c); !slices.Equal(got, []string{"b", "d", "c", "a"}) {
		t.Errorf("après Get(b) : %v, attendu [b d c a]", got)
	}
	Put(c, "e", "e") // évince a
	if got := Keys(c); !slices.Equal(got, []string{"e", "b", "d", "c"}) {
		t.Errorf("après Put(e) : %v, attendu [e b d c]", got)
	}
	Delete(c, "d")
	if got := Keys(c); !slices.Equal(got, []string{"e", "b", "c"}) {
		t.Errorf("après Delete(d) : %v, attendu [e b c]", got)
	}
	Put(c, "f", "f")
	if got := Keys(c); !slices.Equal(got, []string{"f", "e", "b", "c"}) {
		t.Errorf("après Put(f) : %v, attendu [f e b c]", got)
	}
}

func TestM2CapacityOfOneAndMinimum(t *testing.T) {
	for _, capacity := range []int{1, 0, -5} {
		c := NewCache(capacity)
		Put(c, "a", "1")
		Put(c, "b", "2")
		if Len(c) != 1 {
			t.Errorf("NewCache(%d) : Len = %d, attendu 1 (la capacité est d'au moins une entrée)", capacity, Len(c))
		}
		mustMiss(t, c, "a")
		mustGet(t, c, "b", "2")
	}
}

func TestM2DeleteTheOnlyEntryAndTheEnds(t *testing.T) {
	c := NewCache(3)
	Put(c, "a", "1")
	Delete(c, "a")
	if got := Keys(c); len(got) != 0 {
		t.Errorf("Keys d'un cache vidé = %v", got)
	}
	Put(c, "a", "1")
	Put(c, "b", "2")
	Put(c, "c", "3")
	Delete(c, "c") // la plus récente
	Delete(c, "a") // la plus ancienne
	if got := Keys(c); !slices.Equal(got, []string{"b"}) {
		t.Errorf("Keys = %v, attendu [b]", got)
	}
	Put(c, "d", "4")
	Put(c, "e", "5")
	if got := Keys(c); !slices.Equal(got, []string{"e", "d", "b"}) {
		t.Errorf("Keys = %v, attendu [e d b]", got)
	}
}

func TestM3PeekDoesNotRefresh(t *testing.T) {
	c := NewCache(2)
	Put(c, "a", "1")
	Put(c, "b", "2")
	if got, ok := Peek(c, "a"); !ok || got != "1" {
		t.Fatalf("Peek(a) = (%q, %v)", got, ok)
	}
	Put(c, "c", "3") // Peek n'a pas rendu a plus récente : elle est évincée
	if _, ok := Peek(c, "a"); ok {
		t.Errorf("a aurait dû être évincée : Peek ne change pas la récence")
	}
	if _, ok := Peek(c, "b"); !ok {
		t.Errorf("b doit être conservée")
	}
	if got := Keys(c); !slices.Equal(got, []string{"c", "b"}) {
		t.Errorf("Keys = %v", got)
	}
}

func TestM3Stats(t *testing.T) {
	c := NewCache(2)
	Put(c, "a", "1")
	Put(c, "b", "2")
	Get(c, "a")      // succès
	Get(c, "a")      // succès
	Get(c, "zzz")    // échec
	Peek(c, "a")     // ignoré
	Peek(c, "nope")  // ignoré
	Put(c, "c", "3") // éviction de b
	Put(c, "d", "4") // éviction de a
	Delete(c, "c")   // ni éviction ni statistique
	Delete(c, "zzz")
	Get(c, "a") // échec : a a été évincée

	hits, misses, evictions := Stats(c)
	if hits != 2 || misses != 2 || evictions != 2 {
		t.Errorf("Stats = (%d, %d, %d), attendu (2, 2, 2) : seuls Get compte les succès et échecs, Delete n'est pas une éviction", hits, misses, evictions)
	}
}

func TestM3StatsOfAFreshCache(t *testing.T) {
	if h, m, e := Stats(NewCache(3)); h != 0 || m != 0 || e != 0 {
		t.Errorf("Stats initiales = (%d, %d, %d)", h, m, e)
	}
}

func TestM3OperationsAreConstantTime(t *testing.T) {
	c := NewCache(1000)
	start := time.Now()
	for i := 0; i < 400_000; i++ {
		key := fmt.Sprint(i % 1500)
		if i%3 == 0 {
			Put(c, key, key)
		} else {
			Get(c, key)
		}
	}
	if elapsed := time.Since(start); elapsed > 3*time.Second {
		t.Errorf("400 000 opérations en %v : Put et Get doivent être en temps constant (map + liste doublement chaînée), pas en parcourant toutes les entrées", elapsed)
	}
	if Len(c) > 1000 {
		t.Errorf("Len = %d, la capacité de 1000 est dépassée", Len(c))
	}
}

func TestM3ManyOperationsStayConsistent(t *testing.T) {
	c := NewCache(5)
	reference := []string{} // clés de la plus récente à la moins récente
	touch := func(key string) {
		reference = slices.DeleteFunc(reference, func(k string) bool { return k == key })
		reference = slices.Insert(reference, 0, key)
		if len(reference) > 5 {
			reference = reference[:5]
		}
	}
	seed := uint32(12345)
	next := func(n int) int { seed = seed*1664525 + 1013904223; return int(seed>>16) % n }
	for i := 0; i < 5000; i++ {
		key := fmt.Sprint(next(9))
		switch next(3) {
		case 0:
			Put(c, key, key)
			touch(key)
		case 1:
			if _, ok := Get(c, key); ok != slices.Contains(reference, key) {
				t.Fatalf("étape %d : Get(%s) = %v mais la référence contient %v", i, key, ok, reference)
			} else if ok {
				touch(key)
			}
		case 2:
			Delete(c, key)
			reference = slices.DeleteFunc(reference, func(k string) bool { return k == key })
		}
		if got := Keys(c); !slices.Equal(got, reference) {
			t.Fatalf("étape %d : Keys = %v, référence %v", i, got, reference)
		}
	}
}
