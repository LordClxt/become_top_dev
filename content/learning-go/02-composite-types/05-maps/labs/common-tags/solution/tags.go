package lab

import "slices"

// CommonTags renvoie les tags présents dans a et dans b,
// sans doublon et triés par ordre alphabétique.
func CommonTags(a, b []string) []string {
	inA := make(map[string]bool, len(a))
	for _, tag := range a {
		inA[tag] = true
	}
	out := []string{}
	for _, tag := range b {
		if inA[tag] {
			out = append(out, tag)
			delete(inA, tag)
		}
	}
	slices.Sort(out)
	return out
}
