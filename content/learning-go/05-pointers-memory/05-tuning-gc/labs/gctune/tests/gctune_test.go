package lab

import (
	"errors"
	"math"
	"testing"
)

const (
	KiB = uint64(1) << 10
	MiB = uint64(1) << 20
	GiB = uint64(1) << 30
)

func TestNextGCTarget(t *testing.T) {
	cases := []struct {
		heap uint64
		gogc int
		want uint64
		why  string
	}{
		{200 * MiB, 100, 400 * MiB, "GOGC par défaut : le tas double"},
		{200 * MiB, 50, 300 * MiB, "GOGC=50 : +50 %"},
		{200 * MiB, 200, 600 * MiB, "GOGC=200 : +200 %"},
		{200 * MiB, 0, 200 * MiB, "GOGC=0 : déclenchement immédiat"},
		{0, 100, 0, "tas vide"},
		{1, 100, 2, "un octet"},
		{150, 33, 150 + 49, "troncature de la division entière : 150×33/100 = 49"},
		{200 * MiB, GOGCOff, math.MaxUint64, "GOGC=off : jamais"},
		{1 << 62, 100, 1 << 63, "grand tas, sans débordement"},
		{1 << 63, 100, math.MaxUint64, "1<<63 + 1<<63 = 1<<64 : sature au lieu de déborder"},
		{math.MaxUint64, 100, math.MaxUint64, "tas maximal : sature"},
		{math.MaxUint64, 100000, math.MaxUint64, "produit énorme : sature"},
		{1 << 60, 1000, 11 << 60, "GOGC=1000 : ×11"},
	}
	for _, c := range cases {
		if got := NextGCTarget(c.heap, c.gogc); got != c.want {
			t.Errorf("NextGCTarget(%d, %d) = %d, attendu %d — %s", c.heap, c.gogc, got, c.want, c.why)
		}
	}
}

func TestParseMemLimit(t *testing.T) {
	cases := map[string]uint64{
		"0":        0,
		"1024":     1024,
		"1024B":    1024,
		"1KiB":     KiB,
		"512MiB":   512 * MiB,
		"3GiB":     3 * GiB,
		"2TiB":     2 << 40,
		"10":       10,
		"007KiB":   7 * KiB,
		"16383TiB": 16383 << 40,
	}
	for in, want := range cases {
		if got, err := ParseMemLimit(in); err != nil || got != want {
			t.Errorf("ParseMemLimit(%q) = (%d, %v), attendu %d", in, got, err, want)
		}
	}
}

func TestParseMemLimitErrors(t *testing.T) {
	for _, in := range []string{
		"", "GiB", "1.5GiB", "1gib", "1GB", "1KB", "-1", "+1", "1 GiB", " 1", "1MiBB", "0x10",
		"99999999999999999999", "17179869184GiB", "16777216TiB",
	} {
		if got, err := ParseMemLimit(in); err == nil {
			t.Errorf("ParseMemLimit(%q) = %d sans erreur, une erreur était attendue", in, got)
		}
	}
}

func TestReadGCSettings(t *testing.T) {
	cases := []struct {
		name string
		env  map[string]string
		want GCSettings
	}{
		{"défauts", nil, GCSettings{GOGC: 100, MemLimit: NoLimit}},
		{"variables vides", map[string]string{"GOGC": "", "GOMEMLIMIT": ""}, GCSettings{GOGC: 100, MemLimit: NoLimit}},
		{"GOGC seul", map[string]string{"GOGC": "200"}, GCSettings{GOGC: 200, MemLimit: NoLimit}},
		{"GOGC=0", map[string]string{"GOGC": "0"}, GCSettings{GOGC: 0, MemLimit: NoLimit}},
		{"GOGC=off", map[string]string{"GOGC": "off"}, GCSettings{GOGC: GOGCOff, MemLimit: NoLimit}},
		{"GOMEMLIMIT seul", map[string]string{"GOMEMLIMIT": "3GiB"}, GCSettings{GOGC: 100, MemLimit: 3 * GiB}},
		{"les deux", map[string]string{"GOGC": "50", "GOMEMLIMIT": "512MiB"}, GCSettings{GOGC: 50, MemLimit: 512 * MiB}},
		{"autres variables ignorées", map[string]string{"HOME": "/root", "GOGC": "75"}, GCSettings{GOGC: 75, MemLimit: NoLimit}},
	}
	for _, c := range cases {
		if got, err := ReadGCSettings(c.env); err != nil || got != c.want {
			t.Errorf("%s : (%+v, %v), attendu %+v", c.name, got, err, c.want)
		}
	}
}

func TestReadGCSettingsErrors(t *testing.T) {
	for _, env := range []map[string]string{
		{"GOGC": "-5"}, {"GOGC": "abc"}, {"GOGC": "OFF"}, {"GOGC": "1.5"},
		{"GOMEMLIMIT": "lots"}, {"GOMEMLIMIT": "3GB"}, {"GOMEMLIMIT": "-1"},
		{"GOGC": "100", "GOMEMLIMIT": "x"},
	} {
		if got, err := ReadGCSettings(env); err == nil {
			t.Errorf("ReadGCSettings(%v) = %+v sans erreur", env, got)
		}
	}
}

func TestEffectiveTarget(t *testing.T) {
	cases := []struct {
		name string
		heap uint64
		s    GCSettings
		want uint64
	}{
		{"sans limite : GOGC décide", 200 * MiB, GCSettings{GOGC: 100, MemLimit: NoLimit}, 400 * MiB},
		{"limite plus basse que le déclenchement", 200 * MiB, GCSettings{GOGC: 100, MemLimit: 300 * MiB}, 300 * MiB},
		{"limite plus haute : GOGC décide", 200 * MiB, GCSettings{GOGC: 100, MemLimit: 1 * GiB}, 400 * MiB},
		{"GOGC=off + limite : la limite décide", 200 * MiB, GCSettings{GOGC: GOGCOff, MemLimit: 1 * GiB}, 1 * GiB},
		{"GOGC=off sans limite : rien ne déclenche", 200 * MiB, GCSettings{GOGC: GOGCOff, MemLimit: NoLimit}, uint64(NoLimit)},
	}
	for _, c := range cases {
		if got := EffectiveTarget(c.heap, c.s); got != c.want {
			t.Errorf("%s : %d, attendu %d", c.name, got, c.want)
		}
	}
}

func TestCheckLimit(t *testing.T) {
	cases := []struct {
		limit, physical uint64
		safe            bool
	}{
		{3 * GiB, 4 * GiB, true},
		{4 * GiB, 4 * GiB, false},
		{900, 1000, true},
		{901, 1000, false},
		{1, 1000, true},
		{math.MaxInt64, 4 * GiB, false},
		{math.MaxUint64 / 2, math.MaxUint64, true},
		{math.MaxUint64, math.MaxUint64, false},
	}
	for _, c := range cases {
		safe, err := CheckLimit(c.limit, c.physical)
		if err != nil || safe != c.safe {
			t.Errorf("CheckLimit(%d, %d) = (%v, %v), attendu %v", c.limit, c.physical, safe, err, c.safe)
		}
	}
	if _, err := CheckLimit(0, 4*GiB); !errors.Is(err, ErrInvalidLimit) {
		t.Errorf("limite nulle : %v", err)
	}
}
