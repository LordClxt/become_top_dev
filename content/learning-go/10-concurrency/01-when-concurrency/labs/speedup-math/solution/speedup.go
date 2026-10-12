package lab

import "math"

func Speedup(p float64, n int) float64 {
	return 1 / ((1 - p) + p/float64(n))
}

func MaxSpeedup(p float64) float64 {
	if p >= 1 {
		return math.Inf(1)
	}
	return 1 / (1 - p)
}

func CoresFor(p, target float64) (int, bool) {
	if target <= 1 {
		return 1, true
	}
	if target >= MaxSpeedup(p) {
		return 0, false
	}
	// Du plus petit n possible vers le haut : la formule fermée n >= p / (1/target - (1-p)) sert de départ.
	n := int(math.Ceil(p / (1/target - (1 - p))))
	if n < 1 {
		n = 1
	}
	for n > 1 && Speedup(p, n-1) >= target {
		n--
	}
	for Speedup(p, n) < target {
		n++
	}
	return n, true
}

func Chunks(n, parts int) [][2]int {
	if n <= 0 || parts <= 0 {
		return nil
	}
	if parts > n {
		parts = n
	}
	size, extra := n/parts, n%parts
	out := make([][2]int, 0, parts)
	start := 0
	for i := 0; i < parts; i++ {
		end := start + size
		if i < extra {
			end++
		}
		out = append(out, [2]int{start, end})
		start = end
	}
	return out
}
