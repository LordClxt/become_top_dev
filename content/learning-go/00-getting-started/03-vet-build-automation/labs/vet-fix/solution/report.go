// Package lab formate les messages d'un petit outil de build.
package lab

import "fmt"

// Summary décrit un package et son nombre de fichiers : "relay : 3 fichiers".
func Summary(pkg string, files int) string {
	return fmt.Sprintf("%s : %d fichiers", pkg, files)
}

// Duration affiche une durée en millisecondes : "durée : 120 ms".
func Duration(ms int) string {
	return fmt.Sprintf("durée : %d ms", ms)
}

// Status affiche le résultat du build : "statut : ok" ou "statut : échec".
func Status(ok bool) string {
	label := "échec"
	if ok {
		label = "ok"
	}
	return fmt.Sprintf("statut : %s", label)
}

// Percent affiche l'avancement en pourcentage entier : "75%".
func Percent(done, total int) string {
	return fmt.Sprintf("%d%%", done*100/total)
}
