package lab

import (
	"slices"
	"testing"
)

func equalChunks(a, b [][]int) bool {
	return slices.EqualFunc(a, b, func(x, y []int) bool { return slices.Equal(x, y) })
}

func TestChunkValues(t *testing.T) {
	cases := []struct {
		name string
		ids  []int
		n    int
		want [][]int
	}{
		{"divisible", []int{1, 2, 3, 4}, 2, [][]int{{1, 2}, {3, 4}}},
		{"reste", []int{1, 2, 3, 4, 5}, 2, [][]int{{1, 2}, {3, 4}, {5}}},
		{"n plus grand", []int{1, 2}, 5, [][]int{{1, 2}}},
		{"n = 1", []int{7, 8}, 1, [][]int{{7}, {8}}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := Chunk(c.ids, c.n); !equalChunks(got, c.want) {
				t.Errorf("Chunk(%v, %d) = %v, attendu %v", c.ids, c.n, got, c.want)
			}
		})
	}
}

func TestChunkInvalidSize(t *testing.T) {
	if got := Chunk([]int{1, 2}, 0); got != nil {
		t.Errorf("Chunk(..., 0) doit renvoyer nil, obtenu %v", got)
	}
	if got := Chunk([]int{1, 2}, -3); got != nil {
		t.Errorf("Chunk(..., -3) doit renvoyer nil, obtenu %v", got)
	}
}

func TestChunkEmpty(t *testing.T) {
	if got := Chunk(nil, 3); len(got) != 0 {
		t.Errorf("Chunk(nil, 3) doit être de longueur 0, obtenu %v", got)
	}
}

func TestAppendDoesNotCorruptNextChunk(t *testing.T) {
	ids := []int{1, 2, 3, 4, 5, 6}
	chunks := Chunk(ids, 2)
	chunks[0] = append(chunks[0], 99)
	if !slices.Equal(chunks[1], []int{3, 4}) {
		t.Errorf("append sur le lot 0 a corrompu le lot 1 : %v — chaque lot doit avoir une capacité limitée à sa longueur", chunks[1])
	}
	if !slices.Equal(ids, []int{1, 2, 3, 4, 5, 6}) {
		t.Errorf("append sur un lot a modifié ids : %v", ids)
	}
}

func TestChunksDoNotCopy(t *testing.T) {
	ids := []int{1, 2, 3, 4}
	chunks := Chunk(ids, 2)
	ids[0] = 42
	if chunks[0][0] != 42 {
		t.Errorf("les lots doivent partager la mémoire de ids (pas de copie) : ids[0] = 42 mais chunks[0][0] = %d", chunks[0][0])
	}
}
