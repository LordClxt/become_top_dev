package lab

import (
	"errors"
	"fmt"
)

// Types de champ (3 bits de poids faible de l'en-tête, comme dans Protocol Buffers).
const (
	KindVarint = 0 // entier signé, encodé en longueur variable (zigzag)
	KindString = 2 // longueur (varint) puis octets
)

// Field est un champ d'un enregistrement : un numéro, un type, et une valeur selon le type.
type Field struct {
	Tag  int
	Kind int
	Int  int64
	Str  string
}

var (
	ErrTruncated = errors.New("octets tronqués")
	ErrBadKind   = errors.New("type de champ inconnu")
	ErrBadTag    = errors.New("numéro de champ invalide (1 à 15)")
)

// PutVarint encode n en longueur variable : zigzag (pour que les petits négatifs restent courts), puis groupes de
// 7 bits, poids faible d'abord, le bit de poids fort de chaque octet signalant qu'un octet suit.
func PutVarint(n int64) []byte {
	u := uint64(n<<1) ^ uint64(n>>63)
	var out []byte
	for u >= 0x80 {
		out = append(out, byte(u)|0x80)
		u >>= 7
	}
	return append(out, byte(u))
}

// ReadVarint décode un entier au début de b et renvoie sa valeur et le nombre d'octets consommés.
// Octets manquants : ErrTruncated. Plus de 10 octets : erreur.
func ReadVarint(b []byte) (int64, int, error) {
	var u uint64
	for i := 0; i < len(b); i++ {
		if i >= 10 {
			return 0, 0, errors.New("entier trop long")
		}
		u |= uint64(b[i]&0x7f) << (7 * uint(i))
		if b[i]&0x80 == 0 {
			return int64(u>>1) ^ -int64(u&1), i + 1, nil
		}
	}
	return 0, 0, ErrTruncated
}

// EncodeRecord concatène les champs dans l'ordre donné. En-tête d'un champ : un octet (numéro << 3 | type).
func EncodeRecord(fields []Field) ([]byte, error) {
	var out []byte
	for _, f := range fields {
		if f.Tag < 1 || f.Tag > 15 {
			return nil, ErrBadTag
		}
		out = append(out, byte(f.Tag<<3|f.Kind))
		switch f.Kind {
		case KindVarint:
			out = append(out, PutVarint(f.Int)...)
		case KindString:
			out = append(out, PutVarint(int64(len(f.Str)))...)
			out = append(out, f.Str...)
		default:
			return nil, ErrBadKind
		}
	}
	return out, nil
}

// DecodeRecord lit tous les champs, dans l'ordre. Un numéro répété apparaît plusieurs fois.
func DecodeRecord(b []byte) ([]Field, error) {
	var fields []Field
	for len(b) > 0 {
		tag, kind := int(b[0]>>3), int(b[0]&7)
		if tag < 1 || tag > 15 {
			return nil, ErrBadTag
		}
		b = b[1:]
		switch kind {
		case KindVarint:
			v, n, err := ReadVarint(b)
			if err != nil {
				return nil, err
			}
			fields = append(fields, Field{Tag: tag, Kind: kind, Int: v})
			b = b[n:]
		case KindString:
			l, n, err := ReadVarint(b)
			if err != nil {
				return nil, err
			}
			if l < 0 || int64(len(b)-n) < l {
				return nil, ErrTruncated
			}
			fields = append(fields, Field{Tag: tag, Kind: kind, Str: string(b[n : n+int(l)])})
			b = b[n+int(l):]
		default:
			return nil, ErrBadKind
		}
	}
	if fields == nil {
		fields = []Field{}
	}
	return fields, nil
}

// Read joue le rôle d'un ancien code : il ne connaît que les numéros de known. Il renvoie, pour chacun, le DERNIER
// champ rencontré (comme un champ répété lu par un code qui n'attend qu'une valeur), et saute tout le reste.
func Read(rec []byte, known map[int]bool) (map[int]Field, error) {
	fields, err := DecodeRecord(rec)
	if err != nil {
		return nil, err
	}
	out := map[int]Field{}
	for _, f := range fields {
		if known[f.Tag] {
			out[f.Tag] = f
		}
	}
	return out, nil
}

// Update remplace ou ajoute les champs de set (qui ne peuvent porter que des numéros de known), en conservant
// TELS QUELS tous les champs inconnus, dans leur ordre d'origine. Un champ de set remplace la première occurrence
// de son numéro, supprime les suivantes, ou est ajouté à la fin s'il est absent.
func Update(rec []byte, known map[int]bool, set []Field) ([]byte, error) {
	for _, f := range set {
		if !known[f.Tag] {
			return nil, fmt.Errorf("numéro %d inconnu du schéma", f.Tag)
		}
	}
	fields, err := DecodeRecord(rec)
	if err != nil {
		return nil, err
	}
	out := make([]Field, 0, len(fields)+len(set))
	replaced := map[int]bool{}
	for _, f := range fields {
		var repl *Field
		for i := range set {
			if set[i].Tag == f.Tag {
				repl = &set[i]
			}
		}
		switch {
		case repl == nil:
			out = append(out, f)
		case !replaced[f.Tag]:
			out = append(out, *repl)
			replaced[f.Tag] = true
		}
	}
	for _, f := range set {
		if !replaced[f.Tag] {
			out = append(out, f)
			replaced[f.Tag] = true
		}
	}
	return EncodeRecord(out)
}
