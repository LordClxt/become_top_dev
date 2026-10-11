package lab

import (
	"bytes"
	"errors"
	"reflect"
	"testing"
)

// ---------- Jalon 1 ----------

func TestM1PutVarintSizes(t *testing.T) {
	cases := []struct {
		n    int64
		want []byte
	}{
		{0, []byte{0x00}},
		{-1, []byte{0x01}},
		{1, []byte{0x02}},
		{63, []byte{0x7e}},
		{-64, []byte{0x7f}},
		{64, []byte{0x80, 0x01}},
		{300, []byte{0xd8, 0x04}},
		{1337, []byte{0xf2, 0x14}},
		{8191, []byte{0xfe, 0x7f}},
		{8192, []byte{0x80, 0x80, 0x01}},
	}
	for _, c := range cases {
		if got := PutVarint(c.n); !bytes.Equal(got, c.want) {
			t.Errorf("PutVarint(%d) = %x, attendu %x — zigzag puis groupes de 7 bits, poids faible d'abord", c.n, got, c.want)
		}
	}
}

func TestM1VarintRoundTrip(t *testing.T) {
	for _, n := range []int64{0, 1, -1, 63, 64, -64, -65, 1337, -8192, 8191, 8192, 1 << 31, -(1 << 31), 1<<62 + 7, -(1 << 62), 9223372036854775807, -9223372036854775808} {
		b := PutVarint(n)
		got, size, err := ReadVarint(append(b, 0xAA, 0xBB))
		if err != nil || got != n || size != len(b) {
			t.Errorf("ReadVarint(PutVarint(%d)) = %d, %d, %v ; attendu %d, %d", n, got, size, err, n, len(b))
		}
	}
}

func TestM1ReadVarintErrors(t *testing.T) {
	if _, _, err := ReadVarint(nil); !errors.Is(err, ErrTruncated) {
		t.Errorf("entrée vide : err = %v, attendu ErrTruncated", err)
	}
	if _, _, err := ReadVarint([]byte{0x80, 0x80}); !errors.Is(err, ErrTruncated) {
		t.Errorf("l'octet de poids fort annonce une suite qui manque : err = %v, attendu ErrTruncated", err)
	}
	long := bytes.Repeat([]byte{0xff}, 12)
	if _, _, err := ReadVarint(long); err == nil {
		t.Error("plus de 10 octets de continuation : erreur attendue")
	}
}

// ---------- Jalon 2 ----------

func person() []Field {
	return []Field{
		{Tag: 1, Kind: KindString, Str: "Martin"},
		{Tag: 2, Kind: KindVarint, Int: 1337},
		{Tag: 3, Kind: KindString, Str: "daydreaming"},
		{Tag: 3, Kind: KindString, Str: "hacking"},
	}
}

func TestM2EncodeLayout(t *testing.T) {
	got, err := EncodeRecord([]Field{{Tag: 1, Kind: KindVarint, Int: 300}, {Tag: 2, Kind: KindString, Str: "Ada"}})
	if err != nil {
		t.Fatal(err)
	}
	want := []byte{0x08, 0xd8, 0x04, 0x12, 0x06, 'A', 'd', 'a'}
	if !bytes.Equal(got, want) {
		t.Errorf("EncodeRecord = %x, attendu %x — en-tête = numéro<<3 | type ; une chaîne = longueur (varint) + octets", got, want)
	}
	if len(got) != 8 {
		t.Errorf("l'enregistrement doit faire 8 octets, a %d", len(got))
	}
}

func TestM2RoundTripWithRepeated(t *testing.T) {
	b, err := EncodeRecord(person())
	if err != nil {
		t.Fatal(err)
	}
	got, err := DecodeRecord(b)
	if err != nil || !reflect.DeepEqual(got, person()) {
		t.Errorf("DecodeRecord(EncodeRecord(x)) = %v, %v ; attendu %v", got, err, person())
	}
}

func TestM2EmptyAndErrors(t *testing.T) {
	if got, err := DecodeRecord(nil); err != nil || got == nil || len(got) != 0 {
		t.Errorf("DecodeRecord(nil) = %v, %v ; attendu une slice vide non nil", got, err)
	}
	if _, err := EncodeRecord([]Field{{Tag: 0, Kind: KindVarint}}); !errors.Is(err, ErrBadTag) {
		t.Errorf("numéro 0 : err = %v, attendu ErrBadTag", err)
	}
	if _, err := EncodeRecord([]Field{{Tag: 16, Kind: KindVarint}}); !errors.Is(err, ErrBadTag) {
		t.Errorf("numéro 16 : err = %v, attendu ErrBadTag", err)
	}
	if _, err := EncodeRecord([]Field{{Tag: 1, Kind: 5}}); !errors.Is(err, ErrBadKind) {
		t.Errorf("type 5 : err = %v, attendu ErrBadKind", err)
	}
	good, _ := EncodeRecord([]Field{{Tag: 1, Kind: KindString, Str: "hello"}})
	if _, err := DecodeRecord(good[:len(good)-2]); !errors.Is(err, ErrTruncated) {
		t.Errorf("chaîne coupée : err = %v, attendu ErrTruncated", err)
	}
	if _, err := DecodeRecord([]byte{0x0b, 0x00}); !errors.Is(err, ErrBadKind) {
		t.Errorf("type 3 : err = %v, attendu ErrBadKind", err)
	}
	if _, err := DecodeRecord([]byte{0x00, 0x00}); !errors.Is(err, ErrBadTag) {
		t.Errorf("numéro 0 dans les octets : err = %v, attendu ErrBadTag", err)
	}
}

// ---------- Jalon 3 ----------

var v1 = map[int]bool{1: true, 2: true}

func TestM3OldCodeIgnoresUnknownTags(t *testing.T) {
	b, _ := EncodeRecord(person())
	got, err := Read(b, v1)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[1].Str != "Martin" || got[2].Int != 1337 {
		t.Errorf("Read = %v — l'ancien code ne voit que les numéros 1 et 2", got)
	}
	if _, ok := got[3]; ok {
		t.Error("le numéro 3 est inconnu de l'ancien code : il doit être sauté, pas renvoyé")
	}
}

func TestM3RepeatedSeenAsLast(t *testing.T) {
	b, _ := EncodeRecord(person())
	got, _ := Read(b, map[int]bool{3: true})
	if got[3].Str != "hacking" {
		t.Errorf("un code qui attend une seule valeur pour le numéro 3 doit voir la dernière : %q", got[3].Str)
	}
}

func TestM3UpdatePreservesUnknownFields(t *testing.T) {
	b, _ := EncodeRecord(person())
	out, err := Update(b, v1, []Field{{Tag: 2, Kind: KindVarint, Int: 42}})
	if err != nil {
		t.Fatal(err)
	}
	got, _ := DecodeRecord(out)
	want := []Field{
		{Tag: 1, Kind: KindString, Str: "Martin"},
		{Tag: 2, Kind: KindVarint, Int: 42},
		{Tag: 3, Kind: KindString, Str: "daydreaming"},
		{Tag: 3, Kind: KindString, Str: "hacking"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Update = %v\nattendu %v — les champs inconnus (numéro 3) doivent survivre, dans le même ordre", got, want)
	}
}

func TestM3UpdateAddsMissingAndDedups(t *testing.T) {
	b, _ := EncodeRecord([]Field{{Tag: 1, Kind: KindString, Str: "a"}, {Tag: 1, Kind: KindString, Str: "b"}, {Tag: 9, Kind: KindVarint, Int: 7}})
	out, err := Update(b, v1, []Field{{Tag: 1, Kind: KindString, Str: "z"}, {Tag: 2, Kind: KindVarint, Int: 5}})
	if err != nil {
		t.Fatal(err)
	}
	got, _ := DecodeRecord(out)
	want := []Field{{Tag: 1, Kind: KindString, Str: "z"}, {Tag: 9, Kind: KindVarint, Int: 7}, {Tag: 2, Kind: KindVarint, Int: 5}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Update = %v\nattendu %v — remplace la 1ʳᵉ occurrence, supprime les suivantes, ajoute le manquant à la fin", got, want)
	}
}

func TestM3UpdateRejectsUnknownTagInSet(t *testing.T) {
	b, _ := EncodeRecord(person())
	if _, err := Update(b, v1, []Field{{Tag: 3, Kind: KindString, Str: "x"}}); err == nil {
		t.Error("Update ne doit pas écrire un numéro inconnu du schéma de l'appelant")
	}
}

func TestM3UpdateDoesNotMutateInput(t *testing.T) {
	b, _ := EncodeRecord(person())
	before := append([]byte(nil), b...)
	set := []Field{{Tag: 1, Kind: KindString, Str: "Z"}}
	Update(b, v1, set)
	if !bytes.Equal(b, before) || set[0].Str != "Z" {
		t.Error("Update ne doit modifier ni l'enregistrement d'entrée ni set")
	}
}
