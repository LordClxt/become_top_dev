package lab

import "errors"

// Flags est un ensemble de drapeaux sur 5 bits.
type Flags uint8

// TODO: déclare les cinq drapeaux Urgent, Ack, Encrypted, Fragment, Last (un bit chacun, dans cet ordre,
// en partant du bit de poids faible), puis les trois méthodes ci-dessous.
const (
	Urgent    Flags = 0
	Ack       Flags = 0
	Encrypted Flags = 0
	Fragment  Flags = 0
	Last      Flags = 0
)

func (f Flags) Has(x Flags) bool      { panic("à implémenter") }
func (f Flags) With(x Flags) Flags    { panic("à implémenter") }
func (f Flags) Without(x Flags) Flags { panic("à implémenter") }

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
	// TODO
	panic("à implémenter")
}

// UnpackHeader fait l'opération inverse de Pack.
func UnpackHeader(w uint32) Header {
	// TODO
	panic("à implémenter")
}

// Checksum renvoie l'octet c tel que (somme des octets de data + c) % 256 == 0.
func Checksum(data []byte) byte {
	// TODO
	panic("à implémenter")
}

// Encode produit : en-tête (4 octets, grand-boutiste) + charge utile + somme de contrôle (1 octet).
// Le champ Length de h est ignoré : il est calculé à partir de la charge utile.
func Encode(h Header, payload []byte) ([]byte, error) {
	// TODO
	panic("à implémenter")
}

// Decode vérifie et découpe un paquet produit par Encode.
func Decode(packet []byte) (Header, []byte, error) {
	// TODO
	panic("à implémenter")
}
