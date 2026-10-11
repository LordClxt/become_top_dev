package lab

import (
	"encoding/binary"
	"hash/crc32"
	"slices"
)

// Format d'un enregistrement du log (petit-boutiste) :
//
//	crc    uint32  CRC-32 (IEEE) de tout ce qui suit
//	keyLen uint32
//	valLen int32   -1 pour une pierre tombale (aucune valeur ne suit)
//	key    [keyLen]byte
//	value  [valLen]byte
const headerSize = 12

// Store est un moteur clé-valeur à la Bitcask : un log en ajout seul, plus un index en mémoire clé → offset.
// Le « fichier » est un []byte pour garder le TP simple.
type Store struct {
	log   []byte
	index map[string]int // offset du dernier enregistrement vivant de chaque clé
}

func encode(key string, value string, tombstone bool) []byte {
	valLen := int32(len(value))
	if tombstone {
		valLen = -1
		value = ""
	}
	rec := make([]byte, headerSize, headerSize+len(key)+len(value))
	binary.LittleEndian.PutUint32(rec[4:], uint32(len(key)))
	binary.LittleEndian.PutUint32(rec[8:], uint32(valLen))
	rec = append(rec, key...)
	rec = append(rec, value...)
	binary.LittleEndian.PutUint32(rec[0:], crc32.ChecksumIEEE(rec[4:]))
	return rec
}

// decode lit l'enregistrement à l'offset off. ok est faux s'il est tronqué ou corrompu.
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

// Open reconstruit un Store en rejouant le log du début à la fin. Elle s'arrête au premier enregistrement
// tronqué ou dont la somme de contrôle est fausse : tout ce qui suit est ignoré et retiré du log.
// Elle renvoie le Store et le nombre d'octets ignorés. Le log passé en argument n'est pas modifié.
func Open(log []byte) (*Store, int) {
	s := &Store{index: map[string]int{}}
	off := 0
	for off < len(log) {
		key, _, tombstone, size, ok := decode(log, off)
		if !ok {
			break
		}
		if tombstone {
			delete(s.index, key)
		} else {
			s.index[key] = off
		}
		off += size
	}
	s.log = slices.Clone(log[:off])
	return s, len(log) - off
}

// Set ajoute un enregistrement au log et met l'index à jour.
func (s *Store) Set(key, value string) {
	s.index[key] = len(s.log)
	s.log = append(s.log, encode(key, value, false)...)
}

// Delete ajoute une pierre tombale si la clé existe et renvoie true ; sinon ne fait rien et renvoie false.
func (s *Store) Delete(key string) bool {
	if _, ok := s.index[key]; !ok {
		return false
	}
	s.log = append(s.log, encode(key, "", true)...)
	delete(s.index, key)
	return true
}

// Get lit la valeur courante d'une clé : une recherche dans l'index, puis la lecture à l'offset.
func (s *Store) Get(key string) (string, bool) {
	off, ok := s.index[key]
	if !ok {
		return "", false
	}
	_, value, _, _, ok := decode(s.log, off)
	return value, ok
}

// Len renvoie le nombre de clés vivantes.
func (s *Store) Len() int { return len(s.index) }

// Log renvoie une copie du log.
func (s *Store) Log() []byte { return slices.Clone(s.log) }

// Compact réécrit le log pour ne garder que la valeur courante de chaque clé vivante, dans l'ordre où ces
// valeurs avaient été écrites. Les pierres tombales et les anciennes valeurs disparaissent. L'index est reconstruit.
func (s *Store) Compact() {
	type live struct {
		key string
		off int
	}
	entries := make([]live, 0, len(s.index))
	for k, off := range s.index {
		entries = append(entries, live{k, off})
	}
	slices.SortFunc(entries, func(a, b live) int { return a.off - b.off })

	var log []byte
	index := make(map[string]int, len(entries))
	for _, e := range entries {
		_, value, _, _, _ := decode(s.log, e.off)
		index[e.key] = len(log)
		log = append(log, encode(e.key, value, false)...)
	}
	s.log, s.index = log, index
}
