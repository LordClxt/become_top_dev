package lab

import (
	"fmt"
	"testing"
)

func TestSetGetDelete(t *testing.T) {
	s, dropped := Open(nil)
	if dropped != 0 || s.Len() != 0 {
		t.Fatalf("Open(nil) = %d clés, %d octets ignorés", s.Len(), dropped)
	}
	s.Set("42", `{"name":"San Francisco"}`)
	s.Set("123456", `{"name":"London"}`)
	s.Set("42", `{"name":"Exploratorium"}`)
	if v, ok := s.Get("42"); !ok || v != `{"name":"Exploratorium"}` {
		t.Errorf("Get(42) = %q, %v : la valeur la plus récente doit gagner", v, ok)
	}
	if _, ok := s.Get("absente"); ok {
		t.Error("clé absente")
	}
	if s.Len() != 2 {
		t.Errorf("Len = %d, attendu 2", s.Len())
	}
	if !s.Delete("42") || s.Delete("42") || s.Delete("jamais") {
		t.Error("Delete doit renvoyer true seulement pour une clé vivante")
	}
	if _, ok := s.Get("42"); ok || s.Len() != 1 {
		t.Error("42 doit avoir disparu")
	}
}

func TestEmptyAndBinaryValues(t *testing.T) {
	s, _ := Open(nil)
	s.Set("vide", "")
	s.Set("", "clé vide")
	s.Set("bin", "a\x00b,c\n")
	if v, ok := s.Get("vide"); !ok || v != "" {
		t.Errorf("valeur vide : %q, %v — une valeur vide n'est pas une pierre tombale", v, ok)
	}
	if v, ok := s.Get(""); !ok || v != "clé vide" {
		t.Errorf("clé vide : %q, %v", v, ok)
	}
	if v, _ := s.Get("bin"); v != "a\x00b,c\n" {
		t.Errorf("le format binaire n'a pas besoin d'échappement : %q", v)
	}
}

func TestOpenReplaysLogIncludingTombstones(t *testing.T) {
	s, _ := Open(nil)
	s.Set("a", "1")
	s.Set("b", "2")
	s.Set("a", "3")
	s.Delete("b")
	s.Set("c", "4")
	r, dropped := Open(s.Log())
	if dropped != 0 {
		t.Errorf("log intact : %d octets ignorés", dropped)
	}
	for k, want := range map[string]string{"a": "3", "c": "4"} {
		if v, ok := r.Get(k); !ok || v != want {
			t.Errorf("après reprise Get(%s) = %q, %v, attendu %q", k, v, ok, want)
		}
	}
	if _, ok := r.Get("b"); ok {
		t.Error("b a été supprimée : la pierre tombale doit être rejouée, sinon elle réapparaît au redémarrage")
	}
	if r.Len() != 2 {
		t.Errorf("Len = %d, attendu 2", r.Len())
	}
}

func TestOpenDoesNotAliasInput(t *testing.T) {
	s, _ := Open(nil)
	s.Set("a", "1")
	in := s.Log()
	r, _ := Open(in)
	for i := range in {
		in[i] = 0
	}
	if v, ok := r.Get("a"); !ok || v != "1" {
		t.Error("le Store ne doit pas partager la mémoire du log fourni à Open")
	}
	l := r.Log()
	l[0] ^= 0xff
	if _, ok := r.Get("a"); !ok {
		t.Error("Log doit renvoyer une copie")
	}
}

func TestTornWriteIsIgnored(t *testing.T) {
	s, _ := Open(nil)
	s.Set("a", "premier")
	good := len(s.Log())
	s.Set("b", "second enregistrement")
	full := s.Log()

	for cut := good; cut < len(full); cut++ { // crash à n'importe quel octet de l'écriture de b
		r, dropped := Open(full[:cut])
		if v, ok := r.Get("a"); !ok || v != "premier" {
			t.Fatalf("coupure à %d : a perdu (%q, %v)", cut, v, ok)
		}
		if _, ok := r.Get("b"); ok {
			t.Fatalf("coupure à %d : b a été lu alors que son enregistrement est incomplet", cut)
		}
		if dropped != cut-good {
			t.Fatalf("coupure à %d : %d octets ignorés, attendu %d", cut, dropped, cut-good)
		}
		if len(r.Log()) != good {
			t.Fatalf("coupure à %d : le log doit être tronqué à la dernière entrée valide", cut)
		}
		r.Set("c", "après reprise") // on peut continuer à écrire sans corrompre le log
		again, d2 := Open(r.Log())
		if v, ok := again.Get("c"); !ok || v != "après reprise" || d2 != 0 {
			t.Fatalf("coupure à %d : écriture après reprise illisible", cut)
		}
	}
}

func TestChecksumDetectsCorruption(t *testing.T) {
	s, _ := Open(nil)
	s.Set("a", "1")
	mid := len(s.Log()) // début de l'enregistrement de b
	s.Set("b", "valeur du milieu")
	s.Set("c", "3")
	log := s.Log()
	log[mid+headerSize+3] ^= 0x01 // un bit retourné dans l'enregistrement du milieu

	r, dropped := Open(log)
	if v, ok := r.Get("a"); !ok || v != "1" {
		t.Error("a précède la corruption, il doit rester lisible")
	}
	if _, ok := r.Get("b"); ok {
		t.Error("b est corrompu : il ne doit pas être lu")
	}
	if _, ok := r.Get("c"); ok {
		t.Error("après un enregistrement invalide, plus rien n'est fiable : c doit être ignoré")
	}
	if dropped != len(log)-mid {
		t.Errorf("%d octets ignorés, attendu %d", dropped, len(log)-mid)
	}
}

func TestCompact(t *testing.T) {
	s, _ := Open(nil)
	for i := 0; i < 100; i++ {
		s.Set("compteur", fmt.Sprint(i))
	}
	s.Set("x", "1")
	s.Set("y", "2")
	s.Delete("x")
	before := len(s.Log())
	s.Compact()
	if v, ok := s.Get("compteur"); !ok || v != "99" {
		t.Errorf("compteur = %q, %v, attendu 99", v, ok)
	}
	if v, ok := s.Get("y"); !ok || v != "2" {
		t.Error("y a disparu")
	}
	if _, ok := s.Get("x"); ok {
		t.Error("x était supprimée : elle ne doit pas revenir")
	}
	want := len(encode("compteur", "99", false)) + len(encode("y", "2", false))
	if got := len(s.Log()); got != want {
		t.Errorf("log compacté : %d octets (avant %d), attendu %d : une valeur par clé vivante, aucune pierre tombale", got, before, want)
	}
	r, dropped := Open(s.Log())
	if dropped != 0 || r.Len() != 2 {
		t.Errorf("le log compacté doit être valide : %d clés, %d ignorés", r.Len(), dropped)
	}
	s.Set("z", "3")
	if v, ok := s.Get("z"); !ok || v != "3" {
		t.Error("on doit pouvoir écrire après Compact (index reconstruit)")
	}
	if v, _ := s.Get("compteur"); v != "99" {
		t.Error("les offsets de l'index doivent correspondre au nouveau log")
	}
}
