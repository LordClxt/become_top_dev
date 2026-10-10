## Contexte

Un **arbre binaire de recherche** (ABR) range des valeurs de façon à retrouver, insérer et supprimer en temps logarithmique quand il est équilibré. Chaque nœud a au plus deux enfants : à gauche les valeurs plus petites, à droite les plus grandes. C'est la structure qui fait le mieux sentir les pointeurs : une racine, des liens, et le piège de l'arbre vide.

```go
type Tree struct {
	Value       int
	Left, Right *Tree
}
```

Un arbre vide est un pointeur `nil`. Il n'y a pas de doublon.

## Ta mission

Dans `tree.go`, implémente douze fonctions.

| Fonction | Rôle |
|---|---|
| `Insert(root, v) *Tree` | ajoute `v` ; **renvoie la racine** (qui change si l'arbre était vide) ; ignore un doublon |
| `Contains(root, v) bool` | présence de `v` |
| `Min(root)`, `Max(root)` `(int, bool)` | extrêmes ; `false` si vide |
| `Delete(root, v) *Tree` | supprime `v` ; **renvoie la racine** ; absent = inchangé |
| `Size(root) int` | nombre de nœuds |
| `Height(root) int` | 0 pour vide, 1 pour un seul nœud |
| `Walk(root, visit)` | parcours en ordre croissant, **s'arrête** quand `visit` renvoie `false` |
| `InOrder(root) []int` | les valeurs triées (slice vide non nil si vide) |
| `FromSorted(values) *Tree` | arbre **équilibré** (hauteur minimale) depuis des valeurs strictement croissantes |
| `Clone(root) *Tree` | copie **profonde** : aucun nœud partagé |
| `Equal(a, b) bool` | même **forme** et mêmes valeurs |

## Le cœur du problème : `Delete`

Trois cas :

1. **Nœud sans enfant** : on le retire (le parent pointe vers `nil`).
2. **Un seul enfant** : l'enfant prend la place du nœud.
3. **Deux enfants** : on remplace sa valeur par celle de son **successeur** (la plus petite valeur de son sous-arbre droit), puis on supprime ce successeur du sous-arbre droit.

Les fonctions `Insert` et `Delete` **renvoient la racine** : pourquoi ? Parce qu'une fonction ne peut pas rendre non nil le pointeur de l'appelant (leçon 2), et qu'un `Delete` peut faire disparaître la racine. L'appelant écrit `root = Insert(root, 5)`.

## Contraintes

- Tout doit fonctionner sur l'arbre vide (`nil`) sans paniquer.
- `FromSorted` ne modifie pas sa slice d'entrée, et choisit l'élément du milieu comme racine, récursivement.
- Un test compare tes opérations à celles d'un ensemble de référence sur des milliers d'opérations aléatoires.
