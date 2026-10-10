package lab

import (
	"fmt"
	"slices"
	"testing"
	"time"
)

func TestCommonTags(t *testing.T) {
	cases := []struct {
		name string
		a, b []string
		want []string
	}{
		{"simple", []string{"go", "web", "api"}, []string{"api", "go", "rust"}, []string{"api", "go"}},
		{"doublons", []string{"go", "go", "api"}, []string{"go", "go", "go"}, []string{"go"}},
		{"aucun", []string{"go"}, []string{"rust"}, []string{}},
		{"vide", nil, []string{"go"}, []string{}},
		{"tri", []string{"zeta", "alpha", "mid"}, []string{"mid", "zeta", "alpha"}, []string{"alpha", "mid", "zeta"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := CommonTags(c.a, c.b)
			if len(got) == 0 && len(c.want) == 0 {
				return
			}
			if !slices.Equal(got, c.want) {
				t.Errorf("CommonTags(%v, %v) = %v, attendu %v", c.a, c.b, got, c.want)
			}
		})
	}
}

func TestCommonTagsDoesNotModifyInputs(t *testing.T) {
	a := []string{"zeta", "alpha"}
	b := []string{"alpha", "zeta"}
	CommonTags(a, b)
	if !slices.Equal(a, []string{"zeta", "alpha"}) || !slices.Equal(b, []string{"alpha", "zeta"}) {
		t.Errorf("les entrées ont été modifiées : a=%v b=%v", a, b)
	}
}

func TestCommonTagsIsFast(t *testing.T) {
	const n = 100_000
	a := make([]string, n)
	b := make([]string, n)
	for i := range n {
		a[i] = fmt.Sprintf("tag-%d", i)
		b[i] = fmt.Sprintf("tag-%d", i+n/2)
	}
	start := time.Now()
	got := CommonTags(a, b)
	if d := time.Since(start); d > 2*time.Second {
		t.Fatalf("trop lent (%v) : utilise une map comme set au lieu d'une double boucle", d)
	}
	if len(got) != n/2 {
		t.Errorf("attendu %d tags communs, obtenu %d", n/2, len(got))
	}
}
