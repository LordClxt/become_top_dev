## Contexte

Tu écris des utilitaires de manipulation de données pour Relay. Chacun doit se comporter correctement face au passage par valeur : certains doivent **modifier** les données de l'appelant (parce que c'est leur rôle), d'autres doivent **s'interdire** d'y toucher.

## Ta mission

Dans `copies.go`, implémente cinq fonctions.

### `Birthday(p Person) Person`
Renvoie une copie de `p` un an plus âgée. La personne d'origine reste intacte : une struct est passée par valeur, c'est la valeur renvoyée qui porte le changement.

### `Clamp(scores map[string]int)`
Ramène chaque score dans `0…100`, **sur place**. L'appelant doit voir ses scores corrigés. Accepte une map `nil`.

### `Without(s []int, i int) []int`
Renvoie une **nouvelle** slice sans l'élément d'indice `i`. Si `i` est hors de `s`, c'est une copie de `s`. **La slice de l'appelant ne doit jamais être modifiée**, et le résultat ne doit partager aucun élément avec elle.

> Piège classique : `append(s[:i], s[i+1:]...)` décale les éléments dans le tableau partagé et corrompt la slice de l'appelant.

### `Reverse(s []int)`
Inverse `s` **sur place**. Les éléments d'une slice sont partagés avec l'appelant (et avec le tableau d'une slice parente).

### `Resize(s []int, n int) []int`
Renvoie une **nouvelle** slice de longueur exactement `n` : tronquée si `n < len(s)`, complétée de zéros sinon. `n` négatif donne une slice vide. Elle ne modifie pas `s` et ne partage rien avec elle.

## Question de conception

Pour chaque fonction, demande-toi : *est-ce que l'appelant doit voir ce changement ?* Si oui, la fonction travaille sur le contenu partagé (map, éléments de slice). Si non, elle **construit et renvoie** une nouvelle valeur.
