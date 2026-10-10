## Contexte

Tu écris le moteur d'un petit jeu de puzzle. La grille fait toujours 3×3 : c'est un cas parfait pour un array, car la taille est une donnée du problème.

## Ta mission

Dans `grid.go`, implémente :

```go
func RotateClockwise(g Grid) Grid
```

Elle renvoie une **nouvelle** grille tournée d'un quart de tour dans le sens des aiguilles d'une montre.

```
1 2 3        7 4 1
4 5 6   →    8 5 2
7 8 9        9 6 3
```

## Contraintes

- La grille reçue ne doit pas être modifiée (bonne nouvelle : avec un array, c'est naturel).
- Pas de slice : reste sur des arrays.
- Quatre rotations successives doivent redonner la grille de départ.
