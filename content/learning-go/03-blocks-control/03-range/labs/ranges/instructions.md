## Contexte

Tu construis un petit outil d'analyse de texte pour Relay. Il manipule des strings Unicode, compte des mots dans une map et corrige des valeurs en place : les trois situations où `for-range` réserve des surprises.

## Ta mission

Dans `ranges.go`, implémente quatre fonctions.

### `RuneOffsets(s string) []RuneAt`
Décode `s` et renvoie chaque rune avec son **décalage en octets**.

```
"apple_π!" → … {5 '_'} {6 'π'} {8 '!'}     ← le décalage saute de 6 à 8
```

Un octet UTF-8 invalide donne la rune `U+FFFD` et avance d'un octet.

### `FirstRepeat(s string) (r rune, offset int, ok bool)`
La première rune qui apparaît **pour la deuxième fois**, avec le décalage en octets de cette deuxième occurrence. `FirstRepeat("héé")` renvoie `('é', 3, true)`. `ok` vaut `false` quand toutes les runes sont distinctes. La casse compte.

### `DoubleAll(xs []int)`
Double chaque élément **en place**. Accepte `nil`.

### `WordCounts(text string) []WordCount`
Compte les mots de `text` :

- on découpe sur les espaces (`strings.Fields`), on passe en minuscules ;
- on retire la ponctuation `. , ; : ! ? " ' ( ) [ ]` aux extrémités de chaque mot ; un jeton qui devient vide est ignoré ;
- le résultat est **trié** par nombre d'occurrences décroissant, puis par ordre alphabétique.

Le tri est obligatoire : le parcours d'une map est aléatoire, donc sans tri deux appels pourraient renvoyer des ordres différents.

## Contrainte

Utilise `for-range` partout où il convient. Ne convertis pas la string en `[]rune` pour `RuneOffsets` : le décalage en octets s'obtient directement.
