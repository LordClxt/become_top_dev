package lab

import (
	"errors"
	"fmt"
)

// Flags est un ensemble de drapeaux sur 5 bits.
type Flags uint8

const (
	Urgent Flags = 1 << iota
	Ack
	Encrypted
	Fragment
	Last

	allFlags = Urgent | Ack | Encrypted | Fragment | Last
)

func (f Flags) Has(x Flags) bool      { return f&x == x }
func (f Flags) With(x Flags) Flags    { return f | x }
func (f Flags) Without(x Flags) Flags { return f &^ x }

// Header est l'en-tête d'un paquet, rangé sur 32 bits :
//
//	bits 31..29  Version (3 bits)
//	bits 28..24  Flags   (5 bits)
//	bits 23..16  Length  (8 bits, longueur de la charge utile)
//	bits 15..0   ID      (16 bits)
type Header struct {
	Version uint8
	Flags   Flags
	Length  uint8
	ID      uint16
}

var (
	ErrShort    = errors.New("paquet trop court")
	ErrChecksum = errors.New("somme de contrôle invalide")
	ErrLength   = errors.New("longueur annoncée incohérente")
	ErrField    = errors.New("champ hors plage")
	ErrPayload  = errors.New("charge utile trop longue")
)

// Pack range l'en-tête dans un mot de 32 bits.
func (h Header) Pack() (uint32, error) {
	if h.Version > 0b111 {
		return 0, fmt.Errorf("%w : version %d (maximum 7)", ErrField, h.Version)
	}
	if h.Flags&^allFlags != 0 {
		return 0, fmt.Errorf("%w : drapeaux %#b", ErrField, uint8(h.Flags))
	}
	return uint32(h.Version)<<29 | uint32(h.Flags)<<24 | uint32(h.Length)<<16 | uint32(h.ID), nil
}

// UnpackHeader fait l'opération inverse de Pack.
func UnpackHeader(w uint32) Header {
	return Header{
		Version: uint8(w >> 29),
		Flags:   Flags(w >> 24 & uint32(allFlags)),
		Length:  uint8(w >> 16),
		ID:      uint16(w),
	}
}

// Checksum renvoie l'octet c tel que (somme des octets de data + c) % 256 == 0.
func Checksum(data []byte) byte {
	var sum byte
	for _, b := range data {
		sum += b // la somme fait le tour : c'est voulu
	}
	return -sum
}

// Encode produit : en-tête (4 octets, grand-boutiste) + charge utile + somme de contrôle (1 octet).
// Le champ Length de h est ignoré : il est calculé à partir de la charge utile.
func Encode(h Header, payload []byte) ([]byte, error) {
	if len(payload) > 255 {
		return nil, fmt.Errorf("%w : %d octets (maximum 255)", ErrPayload, len(payload))
	}
	h.Length = uint8(len(payload))
	word, err := h.Pack()
	if err != nil {
		return nil, err
	}
	out := make([]byte, 0, 4+len(payload)+1)
	out = append(out, byte(word>>24), byte(word>>16), byte(word>>8), byte(word))
	out = append(out, payload...)
	return append(out, Checksum(out)), nil
}

// Decode vérifie et découpe un paquet produit par Encode.
func Decode(packet []byte) (Header, []byte, error) {
	if len(packet) < 5 {
		return Header{}, nil, fmt.Errorf("%w : %d octets (minimum 5)", ErrShort, len(packet))
	}
	body, sum := packet[:len(packet)-1], packet[len(packet)-1]
	if Checksum(body) != sum {
		return Header{}, nil, ErrChecksum
	}
	word := uint32(body[0])<<24 | uint32(body[1])<<16 | uint32(body[2])<<8 | uint32(body[3])
	h := UnpackHeader(word)
	payload := body[4:]
	if int(h.Length) != len(payload) {
		return Header{}, nil, fmt.Errorf("%w : %d annoncés, %d reçus", ErrLength, h.Length, len(payload))
	}
	return h, payload, nil
}
