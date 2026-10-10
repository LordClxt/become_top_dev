## Contexte

La liste chaînée est l'exercice classique des pointeurs : chaque maillon connaît le suivant, et rien d'autre. Aucun tableau, aucun indice, que des adresses. Tu en construis une, avec toutes les opérations de base, en gérant proprement `nil`.

```go
type Node struct {
	Value int
	Next  *Node
}

type List struct {
	Head *Node
	Len  int
}
```

La liste vide a `Head == nil` et `Len == 0`.

## Ta mission

Dans `list.go`, implémente neuf fonctions. **Toutes acceptent une liste `nil`** et la traitent comme une liste vide, sans paniquer.

| Fonction | Rôle |
|---|---|
| `NewList(values ...int) *List` | crée une liste ; le premier argument est en tête |
| `Push(l, v)` | ajoute `v` en tête (temps constant) |
| `Append(l, v)` | ajoute `v` en queue |
| `Pop(l) (int, bool)` | retire et renvoie la tête ; `false` si vide |
| `Contains(l, v) bool` | présence de `v` |
| `Remove(l, v) bool` | retire la **première** occurrence de `v` ; `false` si absent |
| `Reverse(l)` | inverse **sur place** : relie les maillons existants, n'en crée aucun |
| `ToSlice(l) []int` | les valeurs, de la tête à la queue (slice vide non nil si vide) |
| `InsertSorted(l, v)` | dans une liste triée croissante, insère `v` en gardant l'ordre (après les valeurs égales) |

`Len` doit toujours refléter le nombre de maillons.

## Pièges à anticiper

- **Supprimer la tête** n'est pas la même chose que supprimer un maillon du milieu, sauf si tu raisonnes avec « l'adresse du pointeur qui désigne ce maillon » : `Head` pour le premier, le champ `Next` du précédent pour les autres.
- **Une liste vide** : `Head` vaut `nil`. Ne déréférence jamais sans tester.
- **`Reverse` en place** : tu as besoin de trois pointeurs (précédent, courant, suivant) et de ne pas perdre le suivant avant de changer `Next`.
- Garde `Len` cohérent à chaque modification.
