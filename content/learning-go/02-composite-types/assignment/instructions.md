## Contexte

Un outil d'aide à la rédaction veut afficher un petit rapport sur un texte en français : nombre de mots, vocabulaire, mots les plus utilisés, mot le plus long.

C'est un devoir : il est plus ouvert qu'un TP. Les tests vérifient le résultat, puis une revue (grille ci-dessous) évalue la qualité de ton code.

## Ta mission

Dans `report.go`, implémente :

```go
func Analyze(text string, top int) Report
```

avec

```go
type WordCount struct {
	Word  string
	Count int
}

type Report struct {
	Words       int         // nombre total de mots
	UniqueWords int         // nombre de mots différents
	Top         []WordCount // les `top` mots les plus fréquents
	Longest     string      // le mot le plus long, en caractères
}
```

## Règles

- Un mot est une suite de lettres (`unicode.IsLetter`). Tout le reste (espaces, ponctuation, chiffres, apostrophes) sépare les mots : « l'été » donne « l » et « été ».
- Les mots sont comparés **en minuscules** : « Le » et « le » sont le même mot.
- `Top` : trié par nombre d'occurrences décroissant, puis par ordre alphabétique en cas d'égalité. Au plus `top` éléments.
- `Longest` : en **caractères**, pas en bytes. En cas d'égalité, le premier apparu dans le texte. Toujours en minuscules.
- Texte vide : un `Report` avec des zéros et un `Top` de longueur 0.
