package lab

import (
	"encoding/binary"
	"errors"
	"fmt"
	"hash/crc32"
)

// Dir simule un répertoire : nom de fichier → contenu. C'est le « disque » de Tinybase.
type Dir map[string][]byte

// Options règle le moteur.
type Options struct {
	// MaxSegmentBytes est la taille à partir de laquelle le segment actif est fermé. Valeur par défaut : 1 Mo.
	MaxSegmentBytes int
}

// ErrCorrupt est renvoyée quand un segment fermé contient un enregistrement invalide.
var ErrCorrupt = errors.New("segment fermé corrompu")

const headerSize = 12

// encode, decode, segName et segID sont fournis. Format d'un enregistrement (crc32 | keyLen | valLen (−1 = pierre tombale) | clé | valeur).
func encode(key, value string, tombstone bool) []byte {
	valLen := int32(len(value))
	if tombstone {
		valLen, value = -1, ""
	}
	rec := make([]byte, headerSize, headerSize+len(key)+len(value))
	binary.LittleEndian.PutUint32(rec[4:], uint32(len(key)))
	binary.LittleEndian.PutUint32(rec[8:], uint32(valLen))
	rec = append(rec, key...)
	rec = append(rec, value...)
	binary.LittleEndian.PutUint32(rec[0:], crc32.ChecksumIEEE(rec[4:]))
	return rec
}

func decode(log []byte, off int) (key, value string, tombstone bool, size int, ok bool) {
	if off+headerSize > len(log) {
		return
	}
	keyLen := int(binary.LittleEndian.Uint32(log[off+4:]))
	valLen := int(int32(binary.LittleEndian.Uint32(log[off+8:])))
	tombstone = valLen < 0
	body := keyLen
	if !tombstone {
		body += valLen
	}
	if keyLen < 0 || body < 0 || off+headerSize+body > len(log) {
		return
	}
	size = headerSize + body
	if crc32.ChecksumIEEE(log[off+4:off+size]) != binary.LittleEndian.Uint32(log[off:]) {
		return "", "", false, 0, false
	}
	key = string(log[off+headerSize : off+headerSize+keyLen])
	if !tombstone {
		value = string(log[off+headerSize+keyLen : off+size])
	}
	return key, value, tombstone, size, true
}

func segName(id int) string { return fmt.Sprintf("seg-%06d.log", id) }

func segID(name string) (int, bool) {
	var id int
	if _, err := fmt.Sscanf(name, "seg-%06d.log", &id); err != nil || segName(id) != name {
		return 0, false
	}
	return id, true
}

// loc situe un enregistrement : numéro de segment et offset dans ce segment.
type loc struct{ seg, off int }

// DB est le moteur de stockage de Tinybase : des segments de log, dont un seul est actif, et un index de hachage
// en mémoire clé → (segment, offset).
type DB struct {
	dir    Dir
	opts   Options
	active int
	index  map[string]loc
}

// --- Jalon 1 : écrire, lire, rejouer ---

// Open ouvre (ou crée) une base dans dir. Les segments (fichiers "seg-NNNNNN.log") sont rejoués par ordre
// d'identifiant ; une pierre tombale retire la clé de l'index. Sans segment, crée le segment 1 (vide) qui devient actif.
// Un enregistrement invalide dans un segment fermé donne ErrCorrupt ; dans le segment actif (le plus récent), c'est un
// enregistrement partiel dû à un crash : la fin du fichier est tronquée et le nombre d'octets retirés est renvoyé.
func Open(dir Dir, opts Options) (*DB, int, error) {
	// TODO
	panic("à implémenter")
}

// Set enregistre une valeur dans le segment actif (jalon 2 : si celui-ci atteint MaxSegmentBytes, il est fermé et
// un nouveau segment, d'identifiant + 1, devient actif).
func (db *DB) Set(key, value string) {
	// TODO
	panic("à implémenter")
}

// Delete ajoute une pierre tombale si la clé est vivante et renvoie true ; sinon renvoie false sans rien écrire.
func (db *DB) Delete(key string) bool {
	// TODO
	panic("à implémenter")
}

// Get lit la valeur courante d'une clé.
func (db *DB) Get(key string) (string, bool) {
	// TODO
	panic("à implémenter")
}

// --- Jalon 3 : état et compaction ---

// Stats décrit l'état du moteur.
type Stats struct {
	Segments  int // nombre de fichiers segment (actif compris)
	LiveKeys  int
	DiskBytes int // taille cumulée des segments
}

// Stats renvoie l'état courant.
func (db *DB) Stats() Stats {
	// TODO
	panic("à implémenter")
}

// Compact fusionne les segments fermés en un seul. Il faut au moins 2 segments fermés, sinon rien n'est fait
// et 0 est renvoyé. Seules les valeurs courantes situées dans les segments fermés sont recopiées (les anciennes
// versions et les pierres tombales disparaissent) ; le segment fusionné prend l'identifiant du plus récent segment
// fermé. Le segment actif n'est pas modifié. Renvoie le nombre de segments fermés qui ont été fusionnés.
func (db *DB) Compact() int {
	// TODO
	panic("à implémenter")
}
