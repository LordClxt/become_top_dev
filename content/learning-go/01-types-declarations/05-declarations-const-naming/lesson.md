---
id: go-ch01-l05
title: "var, :=, const et l'art de nommer"
source: { chapter: 2, pages: "52-60" }
duration_min: 25
concepts:
  - id: go-var-vs-short
    label: "Choisir entre var et :="
  - id: go-const
    label: "const : donner un nom à un littéral calculable à la compilation"
  - id: go-unused
    label: "Variables inutilisées interdites, constantes inutilisées permises"
  - id: go-naming
    label: "Nommage idiomatique des variables et constantes"
glossary:
  - term: "inférence de type"
    definition: "Le compilateur déduit le type d'une variable à partir de la valeur qui l'initialise."
  - term: "bloc de package"
    definition: "Portée la plus large : ce qui est déclaré en dehors de toute fonction, visible dans tout le package."
  - term: "constante typée / non typée"
    definition: "Une constante non typée s'adapte à son contexte comme un littéral ; une constante typée n'est utilisable qu'avec son type."
  - term: "camelCase"
    definition: "Convention de nommage où les mots sont collés, chacun commençant par une majuscule sauf le premier : indexCounter."
visuals: [go-ch01-declaration-styles]
labs: [go-ch01-l05-lab-names]
xp: 30
---

## Pourquoi c'est important

Pour un si petit langage, Go offre beaucoup de façons de déclarer une variable. Ce n'est pas du luxe : **chaque forme dit quelque chose** au lecteur. Un développeur Go chevronné lit `var total int` et sait que `0` est voulu, lit `x := compute()` et sait que le type vient de la fonction. Apprendre ce vocabulaire rend ton code plus clair, et c'est exactement ce que la revue de code attend de toi.

## Les formes de `var`

```go
var x int = 10      // forme complète
var y = 10          // le type est déduit : int
var z int           // valeur zéro : 0
var a, b int = 1, 2 // plusieurs variables
var c, d = 3, "go"  // types différents, déduits
```

Pour grouper plusieurs déclarations liées, on utilise une liste :

```go
var (
	host    string
	port    = 8080
	verbose bool
)
```

## La forme courte `:=`

À l'intérieur d'une fonction, `:=` déclare et initialise en une fois, avec déduction de type :

```go
count := 10
name, ok := lookup("ada")
```

Elle a une particularité que `var` n'a pas : elle accepte des variables **déjà existantes** à gauche, à condition qu'**au moins une soit nouvelle**.

```go
x := 10
x, y := 30, "hello" // x est réaffectée, y est créée
```

`:=` est interdit hors d'une fonction : au niveau du package, on doit utiliser `var`.

### Alors, `var` ou `:=` ?

`:=` est la forme la plus courante dans une fonction. Préfère `var` dans trois cas :

1. **Valeur zéro voulue** : `var total int`, plutôt que `total := 0`. L'intention est explicite.
2. **Type différent du type par défaut** : `var ratio float32 = 0.5` ou `var flags byte = 0x0F`. Écrire `flags := byte(0x0F)` est légal, mais `var` est la forme idiomatique.
3. **Éviter une variable fantôme** : comme `:=` peut créer une nouvelle variable quand tu pensais en réutiliser une (ce qu'on appelle le *shadowing*, vu au chapitre sur les blocs), déclare explicitement avec `var`, puis affecte avec `=`.

::visual{id="go-ch01-declaration-styles"}

> **Habitude pro.** Évite de déclarer plusieurs variables sur la même ligne, sauf pour récupérer plusieurs valeurs de retour (`v, err := f()`) ou l'idiome *comma ok*.

### Variables de package : à éviter

Une variable déclarée en dehors de toute fonction est modifiable par n'importe quelle fonction du package. Impossible de savoir qui la change, ni quand. Réserve le niveau package aux valeurs **effectivement immuables**.

## `const`

```go
const maxRetries = 3
const (
	idKey   = "id"
	nameKey = "name"
)
```

Une constante donne un **nom à un littéral**. Elle ne peut contenir que des valeurs que le compilateur sait calculer : nombres, booléens, strings, runes, résultats de `len` ou `cap` sur des tableaux, et des expressions faites de tout cela.

```go
x, y := 5, 10
const z = x + y // erreur : x + y n'est pas une constante
```

Go n'a **aucun moyen** de déclarer immuable une valeur calculée à l'exécution (pas de `final` ni de `readonly`). `const` n'est qu'un nom pour un littéral.

### Typée ou non typée ?

```go
const untyped = 10          // se comporte comme le littéral 10
const typed int = 10        // n'est assignable qu'à un int

var a float64 = untyped     // OK
var b float64 = typed       // erreur : cannot use typed (constant of type int)
```

Laisse une constante **non typée** par défaut : elle est plus flexible. Type-la quand elle doit imposer un type (les énumérations, plus tard dans le cours).

## Variables inutilisées

Toute variable **locale** déclarée doit être **lue** au moins une fois, sinon la compilation échoue avec `declared and not used`. La règle est volontairement stricte : du code mort, c'est du bruit pour toute l'équipe.

Elle a ses limites. Le compilateur ne détecte pas les affectations jamais lues :

```go
x := 10 // jamais lu, mais compile quand même
x = 20
fmt.Println(x)
x = 30  // jamais lu non plus
```

Des outils d'analyse statique les trouvent. Et ni les variables de package ni les **constantes** inutilisées ne sont refusées : une constante non utilisée n'existe tout simplement pas dans le binaire.

## Nommer

Go est permissif sur ce qu'est un identifiant : une lettre ou `_`, puis des lettres, chiffres ou `_`, au sens **Unicode**. Ce que le compilateur accepte n'est pas ce qu'on doit écrire.

```go
π := 3        // valide, mais difficile à taper
ａ := "hello" // « a » pleine largeur (U+FF41)
a := "bye"    // le vrai a (U+0061) : deux variables différentes, identiques à l'écran !
```

Les caractères qui se ressemblent sont le pire cas : le code compile et fait autre chose que ce qu'on lit. Écris tes identifiants en **ASCII**.

Les conventions :

- **camelCase**, jamais de snake_case : `indexCounter`, pas `index_counter`.
- **Pas de MAJUSCULES pour les constantes** : `maxRetries`, pas `MAX_RETRIES`. En Go, la majuscule initiale d'un nom de package signifie « exporté », c'est elle qui joue ce rôle.
- **Nom court dans un petit scope** : `i`, `j` pour un index, `k`, `v` pour clé/valeur d'un `range`. Plus le scope est grand, plus le nom doit être explicite.
- **Pas de type dans le nom** : le typage est fort, `userSlice` n'apporte rien.

Si tu as du mal à suivre tes variables à nom court, c'est le signe que le bloc fait trop de choses.

## Pièges fréquents

- **`:=` qui crée une nouvelle variable** quand on voulait en modifier une (surtout avec `err`).
- **Variable de package modifiable** : source de bugs de concurrence et de tests qui s'influencent.
- **`const` pour une valeur calculée à l'exécution** : ne compile pas.
- **Identifiants Unicode ambigus** : `a` et `ａ` ne sont pas la même variable.

## À retenir

- `var` pour la valeur zéro, un type précis ou un niveau package ; `:=` pour tout le reste dans une fonction.
- `:=` peut réutiliser une variable existante tant qu'une autre est nouvelle.
- `const` nomme un littéral calculable à la compilation ; non typée par défaut ; rien n'est immuable en dehors de ça.
- Variable locale inutilisée : erreur. Constante ou variable de package inutilisée : tolérée.
- Nomme en camelCase, en ASCII, court dans un petit scope, sans MAJUSCULES pour les constantes.
