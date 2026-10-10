---
id: go-ch02-l02
title: "Slices : la séquence de tous les jours"
source: { chapter: 3, pages: "63-70" }
duration_min: 20
concepts:
  - id: go-slice-nil-vs-empty
    label: "Slice nil ou slice vide"
  - id: go-slice-len-cap
    label: "Longueur et capacité d'une slice"
  - id: go-slice-append
    label: "append et la croissance de la capacité"
  - id: go-slice-make
    label: "Pré-allouer avec make"
glossary:
  - term: "slice"
    definition: "Vue de taille variable sur un array sous-jacent. Son type ([]int) ne contient pas de taille."
  - term: "longueur (len)"
    definition: "Nombre d'éléments utilisables dans la slice."
  - term: "capacité (cap)"
    definition: "Nombre de cases réservées dans l'array sous-jacent, à partir du début de la slice."
  - term: "nil"
    definition: "Valeur zéro d'une slice : elle ne pointe vers aucun array, sa longueur et sa capacité valent 0."
visuals: [go-ch02-slice-growth]
labs: [go-ch02-l02-lab-squares]
xp: 30
---

## Pourquoi c'est important

La slice est **la** structure de données de Go. Listes d'utilisateurs, lignes d'un fichier, résultats d'une requête : tout passe par des slices. Bien les maîtriser, c'est éviter des allocations inutiles et des bugs subtils.

## Une slice n'a pas de taille dans son type

```go
var a = [3]int{1, 2, 3} // array : la taille est dans le type
var s = []int{1, 2, 3}  // slice : pas de taille
```

Une seule fonction peut donc traiter des slices de n'importe quelle longueur. C'est tout ce qui manquait aux arrays.

## nil ou vide ?

```go
var s1 []int    // nil : ne pointe vers rien, len 0
s2 := []int{}   // vide mais non nil : len 0
fmt.Println(s1 == nil, s2 == nil) // true false
```

Les deux se comportent pareil avec `len`, `range` et `append`. **Préfère la slice nil** quand tu ne sais pas encore si tu vas la remplir. La seule différence visible arrive en JSON : une slice nil devient `null`, une slice vide devient `[]`.

Une slice n'est **pas comparable** avec `==` (sauf à `nil`). Pour comparer le contenu, utilise le package `slices` :

```go
slices.Equal([]int{1, 2}, []int{1, 2}) // true
```

## append : toujours réassigner

```go
var s []int
s = append(s, 10)         // un élément
s = append(s, 20, 30)     // plusieurs
s = append(s, other...)   // une autre slice entière
```

Oublier `s = ` est une erreur de compilation. La raison : Go passe tout **par valeur**. `append` reçoit une copie de la description de la slice et renvoie la nouvelle description. Tu dois la récupérer.

## Longueur et capacité

Une slice, c'est trois informations :

| Champ | Rôle |
|---|---|
| pointeur | où commence la slice dans l'array sous-jacent |
| `len` | combien d'éléments sont utilisables |
| `cap` | combien de cases sont réservées |

Tant que `len < cap`, `append` écrit dans une case déjà réservée : c'est très rapide. Quand `len == cap`, Go doit **réserver un nouvel array plus grand, copier tout le contenu**, puis ajouter l'élément.

::visual{id="go-ch02-slice-growth"}

```go
var s []int
for i := 0; i < 5; i++ {
    s = append(s, i)
    fmt.Println(len(s), cap(s))
}
// 1 1 / 2 2 / 3 4 / 4 4 / 5 8
```

La capacité double tant qu'elle est petite (moins de 256 éléments), puis grandit d'environ 25 % à chaque fois. Ces réallocations coûtent du temps et du travail au ramasse-miettes.

## make : réserver la bonne taille dès le départ

Si tu connais la taille finale, réserve-la :

```go
a := make([]int, 5)     // len 5, cap 5 : [0 0 0 0 0]
b := make([]int, 0, 10) // len 0, cap 10 : [] prête à recevoir 10 éléments
```

Le piège classique :

```go
x := make([]int, 5)
x = append(x, 10)
fmt.Println(x) // [0 0 0 0 0 10] : append ajoute APRÈS les 5 zéros !
```

**Règle simple :**
- tu vas remplir avec `append` → `make([]T, 0, n)` ;
- tu vas remplir par index (`x[i] = …`) → `make([]T, n)`.

## Vider une slice

`clear(s)` remet chaque élément à sa valeur zéro, **sans changer la longueur**. Pour vraiment vider, réduis la longueur : `s = s[:0]` (tu garderas la capacité, utile pour réutiliser la mémoire).

## Au-delà du livre : le package slices

Depuis Go 1.21, le package `slices` évite de réécrire les mêmes boucles :

```go
slices.Contains(s, 3)  // présence
slices.Index(s, 3)     // position ou -1
slices.Sort(s)         // tri sur place
slices.Max(s)          // plus grand élément
```

Utilise-les plutôt que tes propres versions.

## Pièges fréquents

- `make([]T, n)` puis `append` : des zéros inattendus au début.
- Oublier de réassigner le résultat de `append`.
- Comparer deux slices avec `==` : ne compile pas.
- Laisser une slice grandir élément par élément dans une grosse boucle alors que la taille est connue.

## À retenir

- Une slice = pointeur + longueur + capacité.
- `s = append(s, …)` : toujours réassigner.
- Quand la capacité est pleine, `append` alloue un nouvel array et copie tout.
- Pré-alloue avec `make([]T, 0, n)` quand tu connais la taille.
