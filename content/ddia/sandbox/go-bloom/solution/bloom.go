package lab

import (
	"hash/fnv"
	"math"
)

// Bloom est un filtre de Bloom de m bits et k fonctions de hachage.
type Bloom struct {
	bits []uint64
	m, k uint
}

// positions renvoie les k positions de bits (dans [0, m)) associées à key, par double hachage.
func positions(key string, m, k uint) []uint {
	h := fnv.New64a()
	h.Write([]byte(key))
	sum := h.Sum64()
	h1, h2 := uint64(uint32(sum)), uint64(uint32(sum>>32))|1
	out := make([]uint, k)
	for i := uint(0); i < k; i++ {
		out[i] = uint((h1 + uint64(i)*h2) % uint64(m))
	}
	return out
}

// NewBloom crée un filtre vide de m bits (m >= 1) et k fonctions de hachage (k >= 1).
func NewBloom(m, k uint) *Bloom {
	return &Bloom{bits: make([]uint64, (m+63)/64), m: m, k: k}
}

// Add ajoute une clé au filtre.
func (b *Bloom) Add(key string) {
	for _, p := range positions(key, b.m, b.k) {
		b.bits[p/64] |= 1 << (p % 64)
	}
}

// MayContain renvoie false si la clé est sûrement absente, true si elle est peut-être présente.
func (b *Bloom) MayContain(key string) bool {
	for _, p := range positions(key, b.m, b.k) {
		if b.bits[p/64]&(1<<(p%64)) == 0 {
			return false
		}
	}
	return true
}

// FalsePositiveRate renvoie le taux théorique de faux positifs d'un filtre de m bits et k hachages après n ajouts :
// (1 − e^(−k·n/m))^k.
func FalsePositiveRate(m, k, n uint) float64 {
	return math.Pow(1-math.Exp(-float64(k)*float64(n)/float64(m)), float64(k))
}

// OptimalK renvoie le nombre de fonctions de hachage qui minimise le taux de faux positifs pour m bits et n clés :
// (m/n)·ln 2, arrondi au plus proche, au minimum 1. n = 0 renvoie 1.
func OptimalK(m, n uint) uint {
	if n == 0 {
		return 1
	}
	return uint(max(1, math.Round(float64(m)/float64(n)*math.Ln2)))
}
