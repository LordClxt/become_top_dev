## Contexte

Un service de statistiques calcule le carré de milliers de mesures à chaque requête. Le profileur montre que la fonction actuelle passe son temps à réallouer de la mémoire.

## Ta mission

Dans `squares.go`, implémente :

```go
func Squares(nums []int) []int
```

Elle renvoie une **nouvelle** slice contenant le carré de chaque nombre, dans le même ordre.

```go
Squares([]int{1, -2, 3}) // [1 4 9]
```

## Contraintes

- **Une seule allocation** : la slice résultat doit être réservée à la bonne taille dès le départ. Les tests le mesurent.
- La capacité du résultat doit être exactement égale à sa longueur.
- La slice d'entrée ne doit pas être modifiée.
- Si l'entrée est vide ou nil, renvoie une slice de longueur 0.
