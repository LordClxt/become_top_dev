## Contexte

Tu écris la couche d'affichage d'un tableau de bord : moyennes, pourcentages, couleurs sur 8 bits. Chaque fonction mélange des types différents, et c'est dans les conversions que les bugs se cachent.

## Ta mission

Dans `convert.go`, implémente cinq fonctions.

### `Average(xs []int) float64`
La moyenne des éléments, **décimale** : la moyenne de `[1, 2]` est `1.5`, pas `1`. Renvoie `0` pour une slice vide ou `nil`, sans paniquer.

### `Percent(part, total int) float64`
`part` en pourcentage de `total`. `Percent(1, 3)` vaut `33.33…`. Si `total` vaut `0`, renvoie `0` (pas `+Inf` ni `NaN`).

### `ClampToByte(n int) byte`
Ramène `n` dans `0…255`. `byte(300)` ferait le tour et donnerait `44` : ici on **plafonne** à `255` (et on **plancher** à `0` pour les négatifs).

### `NarrowToInt32(n int64) (value int32, ok bool)`
Convertit en `int32` seulement si la valeur tient. Sinon `ok` vaut `false` et `value` vaut `0`.

### `RoundToInt(f float64) int`
Arrondit au plus proche ; les demi-valeurs s'éloignent de zéro (`2.5 → 3`, `-2.5 → -3`). Attention : `int(f)` **tronque** vers zéro, ce n'est pas un arrondi.

## Contraintes

- Chaque conversion doit être écrite à la main (`float64(x)`, `int32(n)`…), Go n'en fait aucune pour toi.
- Pense à **l'ordre** : convertir avant de diviser, vérifier la plage avant de réduire.
