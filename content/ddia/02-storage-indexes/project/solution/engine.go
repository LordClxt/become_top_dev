package lab

import (
	"encoding/binary"
	"errors"
	"fmt"
	"hash/crc32"
	"slices"
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

// encode et decode : format d'un enregistrement (crc32 | keyLen | valLen (−1 = pierre tombale) | clé | valeur).
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

type loc struct{ seg, off int }

// DB est le moteur de stockage de Tinybase : des segments de log, dont un seul est actif, et un index de hachage
// en mémoire clé → (segment, offset).
type DB struct {
	dir    Dir
	opts   Options
	active int
	index  map[string]loc
}

// Open ouvre (ou crée) une base dans dir. Les segments sont rejoués par ordre d'identifiant. Un enregistrement invalide
// dans un segment fermé donne ErrCorrupt ; dans le segment actif (le plus récent), c'est un enregistrement partiel dû
// à un crash : la fin du fichier est tronquée et le nombre d'octets retirés est renvoyé.
func Open(dir Dir, opts Options) (*DB, int, error) {
	if opts.MaxSegmentBytes <= 0 {
		opts.MaxSegmentBytes = 1 << 20
	}
	var ids []int
	for name := range dir {
		if id, ok := segID(name); ok {
			ids = append(ids, id)
		}
	}
	slices.Sort(ids)
	db := &DB{dir: dir, opts: opts, index: map[string]loc{}}
	if len(ids) == 0 {
		db.active = 1
		dir[segName(1)] = nil
		return db, 0, nil
	}
	dropped := 0
	for n, id := range ids {
		log := dir[segName(id)]
		off := 0
		for off < len(log) {
			key, _, tombstone, size, ok := decode(log, off)
			if !ok {
				break
			}
			if tombstone {
				delete(db.index, key)
			} else {
				db.index[key] = loc{id, off}
			}
			off += size
		}
		if off < len(log) {
			if n != len(ids)-1 {
				return nil, 0, fmt.Errorf("%w : %s à l'offset %d", ErrCorrupt, segName(id), off)
			}
			dropped = len(log) - off
			dir[segName(id)] = slices.Clone(log[:off])
		}
	}
	db.active = ids[len(ids)-1]
	return db, dropped, nil
}

func (db *DB) append(rec []byte) int {
	name := segName(db.active)
	off := len(db.dir[name])
	db.dir[name] = append(db.dir[name], rec...)
	return off
}

func (db *DB) rotateIfFull() {
	if len(db.dir[segName(db.active)]) >= db.opts.MaxSegmentBytes {
		db.active++
		db.dir[segName(db.active)] = nil
	}
}

// Set enregistre une valeur dans le segment actif ; si celui-ci atteint MaxSegmentBytes, il est fermé et un nouveau
// segment (identifiant + 1) devient actif.
func (db *DB) Set(key, value string) {
	off := db.append(encode(key, value, false))
	db.index[key] = loc{db.active, off}
	db.rotateIfFull()
}

// Delete ajoute une pierre tombale si la clé est vivante et renvoie true ; sinon renvoie false sans rien écrire.
func (db *DB) Delete(key string) bool {
	if _, ok := db.index[key]; !ok {
		return false
	}
	db.append(encode(key, "", true))
	delete(db.index, key)
	db.rotateIfFull()
	return true
}

// Get lit la valeur courante d'une clé.
func (db *DB) Get(key string) (string, bool) {
	l, ok := db.index[key]
	if !ok {
		return "", false
	}
	_, value, _, _, ok := decode(db.dir[segName(l.seg)], l.off)
	return value, ok
}

// Stats décrit l'état du moteur.
type Stats struct {
	Segments  int // nombre de fichiers segment (actif compris)
	LiveKeys  int
	DiskBytes int // taille cumulée des segments
}

// Stats renvoie l'état courant.
func (db *DB) Stats() Stats {
	s := Stats{LiveKeys: len(db.index)}
	for name, data := range db.dir {
		if _, ok := segID(name); ok {
			s.Segments++
			s.DiskBytes += len(data)
		}
	}
	return s
}

// Compact fusionne les segments fermés en un seul. Il faut au moins 2 segments fermés, sinon rien n'est fait
// et 0 est renvoyé. Seules les valeurs courantes situées dans les segments fermés sont recopiées (les anciennes
// versions et les pierres tombales disparaissent) ; le segment fusionné prend l'identifiant du plus récent segment
// fermé. Le segment actif n'est pas modifié. Renvoie le nombre de segments fermés qui ont été fusionnés.
func (db *DB) Compact() int {
	var closed []int
	for name := range db.dir {
		if id, ok := segID(name); ok && id != db.active {
			closed = append(closed, id)
		}
	}
	if len(closed) < 2 {
		return 0
	}
	slices.Sort(closed)

	type live struct {
		key string
		l   loc
	}
	var lives []live
	for k, l := range db.index {
		if l.seg != db.active {
			lives = append(lives, live{k, l})
		}
	}
	slices.SortFunc(lives, func(a, b live) int {
		if a.l.seg != b.l.seg {
			return a.l.seg - b.l.seg
		}
		return a.l.off - b.l.off
	})

	target := closed[len(closed)-1]
	var merged []byte
	newIndex := map[string]loc{}
	for _, e := range lives {
		_, value, _, _, _ := decode(db.dir[segName(e.l.seg)], e.l.off)
		newIndex[e.key] = loc{target, len(merged)}
		merged = append(merged, encode(e.key, value, false)...)
	}
	for _, id := range closed {
		delete(db.dir, segName(id))
	}
	if len(merged) > 0 {
		db.dir[segName(target)] = merged
	}
	for k, l := range newIndex {
		db.index[k] = l
	}
	return len(closed)
}
