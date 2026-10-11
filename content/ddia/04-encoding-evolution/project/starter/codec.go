package lab

import "errors"

// Types de champ (3 bits de poids faible de l'en-tête, comme dans Protocol Buffers). (fourni)
const (
	KindVarint = 0 // entier signé, encodé en longueur variable (zigzag)
	KindString = 2 // longueur (varint) puis octets
)

// Field est un champ d'un enregistrement : un numéro, un type, et une valeur selon le type. (fourni)
type Field struct {
	Tag  int
	Kind int
	Int  int64
	Str  string
}

// Erreurs à renvoyer. (fournies)
var (
	ErrTruncated = errors.New("octets tronqués")
	ErrBadKind   = errors.New("type de champ inconnu")
	ErrBadTag    = errors.New("numéro de champ invalide (1 à 15)")
)

// ---------- Jalon 1 : l'entier de longueur variable ----------

// PutVarint encode n en longueur variable : zigzag (pour que les petits négatifs restent courts), puis groupes de
// 7 bits, poids faible d'abord, le bit de poids fort de chaque octet signalant qu'un octet suit.
func PutVarint(n int64) []byte {
	// TODO: zigzag : u = (n << 1) XOR (n >> 63), sur uint64
	return nil
}

// ReadVarint décode un entier au début de b et renvoie sa valeur et le nombre d'octets consommés.
// Octets manquants : ErrTruncated. Plus de 10 octets : erreur.
func ReadVarint(b []byte) (int64, int, error) {
	// TODO
	return 0, 0, errors.New("à implémenter")
}

// ---------- Jalon 2 : l'enregistrement ----------

// EncodeRecord concatène les champs dans l'ordre donné. En-tête d'un champ : un octet (numéro << 3 | type).
// Numéro hors de 1 à 15 : ErrBadTag. Type inconnu : ErrBadKind.
func EncodeRecord(fields []Field) ([]byte, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// DecodeRecord lit tous les champs, dans l'ordre. Un numéro répété apparaît plusieurs fois.
// Sans octets : []Field{} (non nil). Octets manquants : ErrTruncated.
func DecodeRecord(b []byte) ([]Field, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// ---------- Jalon 3 : évoluer sans rien casser ----------

// Read joue le rôle d'un ancien code : il ne connaît que les numéros de known. Il renvoie, pour chacun, le DERNIER
// champ rencontré (comme un champ répété lu par un code qui n'attend qu'une valeur), et saute tout le reste.
func Read(rec []byte, known map[int]bool) (map[int]Field, error) {
	// TODO
	return nil, errors.New("à implémenter")
}

// Update remplace ou ajoute les champs de set (qui ne peuvent porter que des numéros de known), en conservant
// TELS QUELS tous les champs inconnus, dans leur ordre d'origine. Un champ de set remplace la première occurrence
// de son numéro, supprime les suivantes, ou est ajouté à la fin s'il est absent. Numéro hors known : erreur.
func Update(rec []byte, known map[int]bool, set []Field) ([]byte, error) {
	// TODO
	return nil, errors.New("à implémenter")
}
