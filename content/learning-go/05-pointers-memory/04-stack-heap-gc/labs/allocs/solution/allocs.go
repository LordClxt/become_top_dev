package lab

import "strconv"

// JoinInts ajoute à dst les entiers de nums écrits en décimal et séparés par sep, et renvoie le résultat.
// Quand dst a assez de capacité, aucune allocation n'a lieu.
func JoinInts(dst []byte, nums []int, sep byte) []byte {
	for i, n := range nums {
		if i > 0 {
			dst = append(dst, sep)
		}
		dst = strconv.AppendInt(dst, int64(n), 10)
	}
	return dst
}

// CountVowels compte les voyelles de s, majuscules, minuscules et accentuées comprises (a e i o u y et leurs accents).
// Elle n'alloue rien.
func CountVowels(s string) int {
	count := 0
	for _, r := range s {
		switch r {
		case 'a', 'e', 'i', 'o', 'u', 'y', 'A', 'E', 'I', 'O', 'U', 'Y',
			'à', 'â', 'ä', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'ÿ',
			'À', 'Â', 'Ä', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ö', 'Ù', 'Û', 'Ü', 'Ÿ':
			count++
		}
	}
	return count
}

// Dedupe supprime en place les doublons consécutifs de xs et renvoie la slice raccourcie, qui réutilise
// le même tableau. Sur une slice triée, cela supprime tous les doublons.
func Dedupe(xs []int) []int {
	if len(xs) == 0 {
		return xs
	}
	kept := 1
	for _, x := range xs[1:] {
		if x != xs[kept-1] {
			xs[kept] = x
			kept++
		}
	}
	return xs[:kept]
}
