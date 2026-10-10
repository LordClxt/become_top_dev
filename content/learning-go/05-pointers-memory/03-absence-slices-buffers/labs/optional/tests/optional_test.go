package lab

import (
	"bytes"
	"errors"
	"io"
	"strings"
	"testing"
	"testing/iotest"
)

func ptr[T any](v T) *T { return &v }

func TestMerge(t *testing.T) {
	base := Settings{Port: ptr(8080), Debug: ptr(true), Name: ptr("api")}
	cases := []struct {
		name     string
		override Settings
		want     string
	}{
		{"rien à remplacer", Settings{}, "port=8080 debug=true name=api"},
		{"un champ", Settings{Port: ptr(9090)}, "port=9090 debug=true name=api"},
		{"valeurs zéro renseignées", Settings{Port: ptr(0), Debug: ptr(false), Name: ptr("")}, "port=0 debug=false name="},
		{"tout", Settings{Port: ptr(1), Debug: ptr(false), Name: ptr("x")}, "port=1 debug=false name=x"},
	}
	for _, c := range cases {
		if got := Describe(Merge(base, c.override)); got != c.want {
			t.Errorf("%s : %q, attendu %q — un pointeur vers la valeur zéro est une valeur renseignée", c.name, got, c.want)
		}
	}
	if got := Describe(Merge(Settings{}, Settings{})); got != "port=unset debug=unset name=unset" {
		t.Errorf("deux configurations vides : %q", got)
	}
	if got := Describe(Merge(Settings{}, Settings{Name: ptr("n")})); got != "port=unset debug=unset name=n" {
		t.Errorf("champ seulement dans override : %q", got)
	}
}

func TestMergeDoesNotShareMemory(t *testing.T) {
	base := Settings{Port: ptr(1), Debug: ptr(true), Name: ptr("base")}
	override := Settings{Port: ptr(2)}
	merged := Merge(base, override)

	*merged.Port = 100
	*merged.Debug = false
	*merged.Name = "modifié"

	if *base.Port != 1 || *base.Debug != true || *base.Name != "base" {
		t.Errorf("modifier le résultat a modifié base : %d %v %q — copie les valeurs, pas les pointeurs", *base.Port, *base.Debug, *base.Name)
	}
	if *override.Port != 2 {
		t.Errorf("modifier le résultat a modifié override : %d", *override.Port)
	}
}

func TestDescribe(t *testing.T) {
	cases := []struct {
		s    Settings
		want string
	}{
		{Settings{}, "port=unset debug=unset name=unset"},
		{Settings{Port: ptr(8080), Name: ptr("api")}, "port=8080 debug=unset name=api"},
		{Settings{Debug: ptr(false)}, "port=unset debug=false name=unset"},
		{Settings{Port: ptr(0)}, "port=0 debug=unset name=unset"},
	}
	for _, c := range cases {
		if got := Describe(c.s); got != c.want {
			t.Errorf("Describe = %q, attendu %q", got, c.want)
		}
	}
}

func TestParseOptionalInt(t *testing.T) {
	for _, in := range []string{"", "   ", "\t\n"} {
		if got, err := ParseOptionalInt(in); got != nil || err != nil {
			t.Errorf("ParseOptionalInt(%q) = (%v, %v), attendu (nil, nil) : une valeur absente n'est pas une erreur", in, got, err)
		}
	}
	cases := map[string]int{"42": 42, "0": 0, "-7": -7, " 15 ": 15}
	for in, want := range cases {
		got, err := ParseOptionalInt(in)
		if err != nil || got == nil || *got != want {
			t.Errorf("ParseOptionalInt(%q) = (%v, %v), attendu %d", in, got, err, want)
		}
	}
	for _, in := range []string{"abc", "1.5", "12x", "--3"} {
		if got, err := ParseOptionalInt(in); got != nil || err == nil {
			t.Errorf("ParseOptionalInt(%q) = (%v, %v), attendu (nil, erreur)", in, got, err)
		}
	}
	a, _ := ParseOptionalInt("5")
	b, _ := ParseOptionalInt("5")
	if a == b {
		t.Errorf("chaque appel doit renvoyer un pointeur distinct")
	}
}

func TestReadChunksReadsEverything(t *testing.T) {
	text := strings.Repeat("abcdefghij", 25) // 250 octets
	var got bytes.Buffer
	var sizes []int
	err := ReadChunks(strings.NewReader(text), make([]byte, 64), func(chunk []byte) error {
		sizes = append(sizes, len(chunk))
		got.Write(chunk)
		return nil
	})
	if err != nil || got.String() != text {
		t.Fatalf("lecture complète : erreur %v, %d octets lus sur %d", err, got.Len(), len(text))
	}
	if want := []int{64, 64, 64, 58}; len(sizes) != 4 || sizes[0] != 64 || sizes[3] != 58 {
		t.Errorf("tailles des morceaux = %v, attendu %v : seule la partie remplie du tampon doit être transmise", sizes, want)
	}
}

func TestReadChunksWithTrickyReaders(t *testing.T) {
	text := "Go est un langage compilé, statique, avec un ramasse-miettes."
	readers := map[string]io.Reader{
		"un octet à la fois": iotest.OneByteReader(strings.NewReader(text)),
		"données puis EOF":   iotest.DataErrReader(strings.NewReader(text)),
		"lectures coupées":   iotest.HalfReader(strings.NewReader(text)),
	}
	for name, r := range readers {
		var got strings.Builder
		err := ReadChunks(r, make([]byte, 16), func(chunk []byte) error { got.Write(chunk); return nil })
		if err != nil || got.String() != text {
			t.Errorf("%s : erreur %v, texte %q", name, err, got.String())
		}
	}
}

func TestReadChunksErrors(t *testing.T) {
	boom := errors.New("handle a échoué")
	calls := 0
	err := ReadChunks(strings.NewReader(strings.Repeat("x", 100)), make([]byte, 10), func([]byte) error {
		calls++
		if calls == 3 {
			return boom
		}
		return nil
	})
	if err != boom || calls != 3 {
		t.Errorf("l'erreur de handle doit arrêter la lecture : erreur %v après %d appels", err, calls)
	}

	failing := io.MultiReader(strings.NewReader("abc"), iotest.ErrReader(errors.New("disque en feu")))
	var got strings.Builder
	err = ReadChunks(failing, make([]byte, 8), func(c []byte) error { got.Write(c); return nil })
	if err == nil || err.Error() != "disque en feu" || got.String() != "abc" {
		t.Errorf("erreur de lecture : %v, données reçues %q (les données lues avant l'erreur doivent être transmises)", err, got.String())
	}

	if err := ReadChunks(strings.NewReader("abc"), nil, func([]byte) error { return nil }); !errors.Is(err, ErrEmptyBuffer) {
		t.Errorf("tampon nil : %v", err)
	}
	if err := ReadChunks(strings.NewReader(""), make([]byte, 4), func([]byte) error { t.Error("handle ne doit pas être appelée"); return nil }); err != nil {
		t.Errorf("source vide : %v", err)
	}
}

func TestReadChunksPassesViewsOnTheBuffer(t *testing.T) {
	buf := make([]byte, 8)
	_ = ReadChunks(strings.NewReader("abcdefgh12345"), buf, func(chunk []byte) error {
		if &chunk[0] != &buf[0] {
			t.Errorf("le morceau doit être une vue sur le tampon fourni (buf[:n]), pas une copie")
		}
		return nil
	})
}

func TestReadChunksDoesNotAllocateInItsLoop(t *testing.T) {
	data := bytes.Repeat([]byte("0123456789"), 100_000) // 1 Mo
	reader := bytes.NewReader(data)
	buf := make([]byte, 1024)
	total := 0
	handle := func(chunk []byte) error { total += len(chunk); return nil }

	allocs := testing.AllocsPerRun(5, func() {
		reader.Reset(data)
		if err := ReadChunks(reader, buf, handle); err != nil {
			t.Fatal(err)
		}
	})
	if allocs > 2 {
		t.Errorf("%.0f allocations pour lire 1 Mo en ~1000 morceaux : alloue le tampon une fois, pas à chaque lecture", allocs)
	}
	if total == 0 {
		t.Errorf("rien n'a été lu")
	}
}
