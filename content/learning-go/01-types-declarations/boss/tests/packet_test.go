package lab

import (
	"bytes"
	"errors"
	"testing"
)

func TestFlags(t *testing.T) {
	if Urgent != 0b00001 || Ack != 0b00010 || Encrypted != 0b00100 || Fragment != 0b01000 || Last != 0b10000 {
		t.Fatalf("les drapeaux doivent occuper un bit chacun, dans l'ordre Urgent, Ack, Encrypted, Fragment, Last : %b %b %b %b %b",
			Urgent, Ack, Encrypted, Fragment, Last)
	}
	f := Ack.With(Last)
	if f != 0b10010 || !f.Has(Ack) || !f.Has(Last) || f.Has(Urgent) {
		t.Errorf("Ack.With(Last) = %05b", f)
	}
	if !f.Has(Ack | Last) {
		t.Errorf("Has doit exiger tous les bits demandés")
	}
	if f.Has(Ack | Urgent) {
		t.Errorf("Has(Ack|Urgent) ne doit pas être vrai quand Urgent manque")
	}
	if got := f.Without(Ack); got != Last {
		t.Errorf("Without(Ack) = %05b, attendu %05b — pense à &^", got, Last)
	}
	if got := f.Without(Urgent); got != f {
		t.Errorf("retirer un drapeau absent ne doit rien changer, reçu %05b", got)
	}
}

func TestPack(t *testing.T) {
	h := Header{Version: 5, Flags: Ack | Last, Length: 200, ID: 0xBEEF}
	got, err := h.Pack()
	if err != nil || got != 0xB2C8BEEF {
		t.Errorf("Pack() = (%#08x, %v), attendu 0xB2C8BEEF — version << 29 | flags << 24 | longueur << 16 | id", got, err)
	}
	if got, _ := (Header{Version: 7, Flags: 0b11111, Length: 255, ID: 0xFFFF}).Pack(); got != 0xFFFFFFFF {
		t.Errorf("tous les champs au maximum : %#08x, attendu 0xFFFFFFFF", got)
	}
	if got, _ := (Header{}).Pack(); got != 0 {
		t.Errorf("en-tête vide : %#08x, attendu 0", got)
	}
}

func TestPackRejectsOutOfRangeFields(t *testing.T) {
	for _, h := range []Header{
		{Version: 8},
		{Version: 255},
		{Flags: 0b100000},
		{Flags: 0xFF},
	} {
		if got, err := h.Pack(); !errors.Is(err, ErrField) {
			t.Errorf("%+v.Pack() = (%#x, %v), attendu ErrField — sinon les bits débordent sur le champ voisin", h, got, err)
		}
	}
}

func TestUnpackHeader(t *testing.T) {
	want := Header{Version: 5, Flags: Ack | Last, Length: 200, ID: 0xBEEF}
	if got := UnpackHeader(0xB2C8BEEF); got != want {
		t.Errorf("UnpackHeader(0xB2C8BEEF) = %+v, attendu %+v", got, want)
	}
	if got := UnpackHeader(0xFFFFFFFF); got != (Header{Version: 7, Flags: 0b11111, Length: 255, ID: 0xFFFF}) {
		t.Errorf("UnpackHeader(0xFFFFFFFF) = %+v", got)
	}
}

func TestPackUnpackRoundTrip(t *testing.T) {
	for v := uint8(0); v < 8; v++ {
		for _, f := range []Flags{0, Urgent, Ack | Fragment, 0b11111} {
			h := Header{Version: v, Flags: f, Length: v * 31, ID: uint16(v) * 9001}
			w, err := h.Pack()
			if err != nil || UnpackHeader(w) != h {
				t.Fatalf("aller-retour cassé pour %+v : %#x, %v, %+v", h, w, err, UnpackHeader(w))
			}
		}
	}
}

func TestChecksum(t *testing.T) {
	cases := []struct {
		in   []byte
		want byte
		why  string
	}{
		{nil, 0, "aucune donnée"},
		{[]byte{0x01, 0x02, 0x03}, 0xFA, "somme 6 : il faut 250 pour atteindre 256"},
		{[]byte{0xFF, 0x01}, 0x00, "la somme fait 256, soit 0 sur un octet"},
		{[]byte{0x80, 0x80, 0x01}, 0xFF, "somme 257, soit 1 : il faut 255"},
		{[]byte{0xFF, 0xFF, 0xFF}, 0x03, "la somme déborde plusieurs fois"},
	}
	for _, c := range cases {
		if got := Checksum(c.in); got != c.want {
			t.Errorf("Checksum(% x) = %#02x, attendu %#02x — %s", c.in, got, c.want, c.why)
		}
		var sum byte
		for _, b := range c.in {
			sum += b
		}
		if sum+Checksum(c.in) != 0 {
			t.Errorf("la somme des octets plus la somme de contrôle doit valoir 0 modulo 256")
		}
	}
}

func TestEncode(t *testing.T) {
	got, err := Encode(Header{Version: 1, Flags: Ack, ID: 0x0102}, []byte("hi"))
	want := []byte{0x22, 0x02, 0x01, 0x02, 'h', 'i', 0x08}
	if err != nil || !bytes.Equal(got, want) {
		t.Errorf("Encode() = (% x, %v), attendu % x — le champ Length est calculé depuis la charge utile", got, err, want)
	}
	// Le champ Length fourni par l'appelant est ignoré.
	got2, _ := Encode(Header{Version: 1, Flags: Ack, Length: 99, ID: 0x0102}, []byte("hi"))
	if !bytes.Equal(got2, want) {
		t.Errorf("Encode doit ignorer Header.Length : % x", got2)
	}
	empty, err := Encode(Header{ID: 7}, nil)
	if err != nil || !bytes.Equal(empty, []byte{0x00, 0x00, 0x00, 0x07, 0xF9}) {
		t.Errorf("paquet sans charge utile : (% x, %v)", empty, err)
	}
}

func TestEncodeErrors(t *testing.T) {
	if _, err := Encode(Header{}, make([]byte, 256)); !errors.Is(err, ErrPayload) {
		t.Errorf("256 octets de charge utile : attendu ErrPayload, reçu %v", err)
	}
	if _, err := Encode(Header{}, make([]byte, 255)); err != nil {
		t.Errorf("255 octets de charge utile doivent passer : %v", err)
	}
	if _, err := Encode(Header{Version: 9}, nil); !errors.Is(err, ErrField) {
		t.Errorf("version 9 : attendu ErrField, reçu %v", err)
	}
}

func TestDecode(t *testing.T) {
	h, payload, err := Decode([]byte{0x22, 0x02, 0x01, 0x02, 'h', 'i', 0x08})
	if err != nil || h != (Header{Version: 1, Flags: Ack, Length: 2, ID: 0x0102}) || string(payload) != "hi" {
		t.Errorf("Decode() = (%+v, %q, %v)", h, payload, err)
	}
	big := bytes.Repeat([]byte{0xA5}, 255)
	packet, _ := Encode(Header{Version: 3, Flags: Encrypted | Fragment, ID: 4242}, big)
	h, payload, err = Decode(packet)
	if err != nil || h.Length != 255 || !bytes.Equal(payload, big) || h.ID != 4242 {
		t.Errorf("aller-retour avec 255 octets : (%+v, %d octets, %v)", h, len(payload), err)
	}
}

func TestDecodeErrors(t *testing.T) {
	valid := []byte{0x22, 0x02, 0x01, 0x02, 'h', 'i', 0x08}

	for n := 0; n < 5; n++ {
		if _, _, err := Decode(valid[:n]); !errors.Is(err, ErrShort) {
			t.Errorf("Decode de %d octets : attendu ErrShort, reçu %v", n, err)
		}
	}

	for i := range valid {
		corrupted := bytes.Clone(valid)
		corrupted[i] ^= 0x10
		if _, _, err := Decode(corrupted); !errors.Is(err, ErrChecksum) {
			t.Errorf("octet %d altéré : attendu ErrChecksum, reçu %v", i, err)
		}
	}

	// Longueur annoncée (5) différente de la charge utile réelle (2), mais somme de contrôle valide.
	body := []byte{0x20, 0x05, 0x00, 0x01, 'h', 'i'}
	liar := append(body, Checksum(body))
	if _, _, err := Decode(liar); !errors.Is(err, ErrLength) {
		t.Errorf("longueur incohérente : attendu ErrLength, reçu %v", err)
	}
}
