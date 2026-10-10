---
id: go-ch02-l05
title: "Maps : associer une clé à une valeur"
source: { chapter: 3, pages: "80-85" }
duration_min: 20
concepts:
  - id: go-map-nil
    label: "Map nil : lecture possible, écriture interdite"
  - id: go-map-comma-ok
    label: "L'idiome comma ok"
  - id: go-map-as-set
    label: "Utiliser une map comme set"
  - id: go-map-keys
    label: "Les clés doivent être comparables"
glossary:
  - term: "map"
    definition: "Table de hachage intégrée au langage, de type map[Clé]Valeur."
  - term: "comma ok"
    definition: "Forme v, ok := m[k] qui indique si la clé existe vraiment."
  - term: "set"
    definition: "Ensemble sans doublons. Go n'en a pas : on utilise map[T]bool ou map[T]struct{}."
visuals: [go-ch02-map-buckets]
labs: [go-ch02-l05-lab-common-tags]
xp: 30
---

## Pourquoi c'est important

Compter des occurrences, retrouver un utilisateur par son identifiant, éliminer des doublons : la map est l'outil pour tout ça. Elle a deux comportements surprenants qu'il faut connaître avant qu'ils ne provoquent un bug.

## Créer une map

```go
var nilMap map[string]int           // nil
ages := map[string]int{}            // vide, prête à l'emploi
ages = map[string]int{"Ana": 31, "Léo": 28}
big := make(map[string]int, 1000)   // taille prévue, mais len 0
```

## Surprise n°1 : la map nil

On peut **lire** une map nil : elle renvoie la valeur zéro. Mais **écrire** dedans provoque une panic :

```go
var m map[string]int
fmt.Println(m["x"]) // 0
m["x"] = 1          // panic: assignment to entry in nil map
```

Initialise toujours une map avant d'écrire : `map[K]V{}` ou `make(map[K]V)`.

## Surprise n°2 : une clé absente renvoie la valeur zéro

```go
wins := map[string]int{}
wins["Orcas"]++              // 0 + 1 : pratique pour compter
fmt.Println(wins["Lions"])   // 0, et pourtant la clé n'existe pas
```

C'est très pratique pour compter. Mais comment savoir si la clé existe vraiment ? Avec **comma ok** :

```go
v, ok := wins["Lions"]
if !ok {
    fmt.Println("pas d'équipe Lions")
}
```

Tu retrouveras cet idiome avec les channels et les assertions de type.

## Supprimer et vider

```go
delete(m, "Ana") // ne fait rien si la clé n'existe pas
clear(m)         // supprime toutes les clés : len devient 0
```

Attention : `clear` vide une map, alors que sur une slice il remet seulement les éléments à zéro.

## Les clés doivent être comparables

Une clé doit supporter `==` : nombres, strings, booleans, arrays, structs de champs comparables. **Pas de slice ni de map comme clé.**

## L'ordre de parcours est aléatoire

```go
for k, v := range m { … }
```

L'ordre change d'une exécution à l'autre, volontairement. Si tu as besoin d'un ordre, récupère les clés et trie-les :

```go
keys := slices.Sorted(maps.Keys(m)) // Go 1.23+
```

(`fmt.Println` affiche toujours une map triée par clé, pour faciliter le débogage.)

::visual{id="go-ch02-map-buckets"}

## Une map comme set

Go n'a pas de type set. On utilise une map dont seule la clé compte :

```go
seen := map[string]bool{}
for _, w := range words {
    seen[w] = true
}
if seen["go"] { … } // false si absent : valeur zéro
```

Variante : `map[string]struct{}`. Une `struct{}` vide occupe 0 octet, mais il faut alors utiliser comma ok pour tester la présence. Pour des sets de taille normale, `map[T]bool` est plus lisible.

## Comparer deux maps

`==` ne fonctionne pas entre maps. Utilise `maps.Equal(a, b)`.

## Map ou slice ?

- L'ordre compte, ou tu parcours tout dans l'ordre → **slice**.
- Tu cherches par une clé (nom, identifiant) → **map**.

## Pièges fréquents

- Écrire dans une map déclarée avec `var m map[K]V` sans l'initialiser.
- Confondre « clé absente » et « valeur zéro » sans utiliser comma ok.
- Supposer un ordre de parcours stable (tests qui passent « par hasard »).

## À retenir

- Lecture d'une map nil : OK. Écriture : panic.
- Une clé absente renvoie la valeur zéro ; comma ok fait la différence.
- L'ordre de `range` sur une map est aléatoire.
- Un set en Go : `map[T]bool`.
