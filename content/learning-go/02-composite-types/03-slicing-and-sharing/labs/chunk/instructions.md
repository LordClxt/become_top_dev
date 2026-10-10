## Contexte

Un service envoie des identifiants de commandes à une API qui accepte au maximum `n` identifiants par appel. Un collègue a écrit `Chunk` pour découper la liste en lots. Ça marchait… jusqu'au jour où un traitement a ajouté un identifiant à la fin d'un lot, et le lot suivant a été corrompu.

## Ta mission

Dans `chunk.go`, implémente :

```go
func Chunk(ids []int, n int) [][]int
```

```go
Chunk([]int{1, 2, 3, 4, 5}, 2) // [[1 2] [3 4] [5]]
```

## Contraintes

- Le dernier lot peut être plus court que `n`.
- Si `n <= 0`, renvoie `nil`.
- Si `ids` est vide, renvoie un résultat de longueur 0.
- **Faire `append` sur un lot ne doit modifier ni `ids`, ni les autres lots.** Les tests le vérifient.
- Pas de copie des données : les lots peuvent partager la mémoire de `ids` tant qu'un `append` ne peut pas déborder.
