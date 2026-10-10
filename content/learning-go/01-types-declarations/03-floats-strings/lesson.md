---
id: go-ch01-l03
title: "Flottants, strings et runes : un premier aperçu"
source: { chapter: 2, pages: "46-50" }
duration_min: 25
concepts:
  - id: go-float-precision
    label: "Les flottants sont des approximations"
  - id: go-float-compare
    label: "Comparer des flottants avec une tolérance"
  - id: go-string-rune-basics
    label: "Strings immuables et runes"
glossary:
  - term: "IEEE 754"
    definition: "Norme de représentation des nombres à virgule flottante, utilisée par Go, C, Java, JavaScript…"
  - term: "epsilon"
    definition: "Écart maximal toléré entre deux flottants pour les considérer comme égaux."
  - term: "NaN"
    definition: "Not a Number : résultat d'une opération sans sens, comme 0/0. NaN n'est égal à rien, pas même à lui-même."
  - term: "immuable"
    definition: "Qui ne peut pas être modifié après sa création. On peut réassigner une variable string, pas changer les octets de la string."
visuals: [go-ch01-float-precision]
labs: [go-ch01-l03-lab-money]
xp: 30
---

## Pourquoi c'est important

« Pourquoi mon total fait 0,30000000000000004 ? » est une des questions les plus posées de la programmation. La réponse tient en une idée : un flottant est une **approximation**. Cette leçon t'apprend à les utiliser là où ils sont justes (mesures, statistiques, graphismes) et à les éviter là où ils sont dangereux (l'argent).

## Les flottants

Go propose deux types, `float32` et `float64`, qui suivent la norme IEEE 754. Leur valeur zéro est `0`.

- **`float64`** a environ 15 à 16 chiffres décimaux de précision ; **`float32`**, seulement 6 à 7.
- Les littéraux décimaux (`3.14`) sont des `float64` par défaut.
- Règle simple : **utilise `float64`**, sauf si un format existant t'impose le contraire. La mémoire économisée avec `float32` ne vaut presque jamais la précision perdue.

Tous les opérateurs arithmétiques et de comparaison fonctionnent, **sauf `%`** (il n'existe pas pour les flottants, tu utiliseras `math.Mod`).

### Un flottant n'est pas un décimal

Un flottant stocke l'approximation binaire la plus proche, pas la valeur décimale que tu as écrite. `0.1` n'a pas de représentation exacte en binaire, pas plus que `1/3` n'en a une en décimal.

```go
a, b := 0.1, 0.2
fmt.Println(a + b)         // 0.30000000000000004
fmt.Println(a+b == 0.3)    // false
```

::visual{id="go-ch01-float-precision"}

> **Piège de constantes.** Si tu écris directement `0.1 + 0.2 == 0.3` avec des littéraux, Go répond `true` : les constantes sont calculées avec une précision exacte à la compilation. Le problème n'apparaît qu'avec des *variables* flottantes.

**Conséquence :** ne représente jamais de l'argent, ni aucune valeur décimale qui doit être exacte, avec un flottant. Utilise des **entiers** (des centimes) ou une bibliothèque décimale.

### Valeurs spéciales

```go
var zero float64
fmt.Println(1/zero, -1/zero, zero/zero) // +Inf -Inf NaN
```

Diviser un flottant non nul par zéro donne `+Inf` ou `-Inf` ; `0/0` donne `NaN`. Contrairement aux entiers, **aucun panic**. Et `NaN` n'est égal à rien, lui compris : `nan == nan` vaut `false`. Pour le détecter, utilise `math.IsNaN(x)`.

### Comparer deux flottants

`==` et `!=` fonctionnent, mais ils comparent des approximations. On compare plutôt la **distance** à une tolérance :

```go
func approx(a, b, eps float64) bool {
	return math.Abs(a-b) <= eps
}
```

Le bon `eps` dépend de ton besoin (1e-9 pour des mesures courantes, par exemple). Pour des grandeurs très différentes en ordre de grandeur, on utilise plutôt une tolérance **relative** (`eps × max(|a|, |b|)`).

### Les nombres complexes (en passant)

Go a `complex64` et `complex128`, avec `complex(re, im)`, `real` et `imag`. Presque personne ne s'en sert, tu peux les ignorer jusqu'à ce que tu en aies besoin.

## Un premier aperçu des strings et des runes

- La valeur zéro d'une `string` est la chaîne vide `""`.
- Les strings se comparent avec `== != < <= > >=` (ordre des octets) et se concatènent avec `+`.
- Elles sont **immuables** : tu peux réassigner la variable, pas modifier la string existante.
- Un **`rune`** représente un seul point de code Unicode ; c'est un alias de `int32`.

```go
var initial rune = 'J'   // le type dit « un caractère »
var n int32 = 'B'        // légal, mais l'intention est floue : préfère rune
```

Écris `rune` quand tu parles d'un caractère. Les strings sont en réalité des suites d'**octets** UTF-8 : `len("héllo")` vaut 6, pas 5, car `é` en prend deux. Le chapitre suivant du cours y revient en détail.

## Pièges fréquents

- **`f1 == f2` sur des résultats de calcul.** Compare avec une tolérance.
- **Des euros en `float64`.** `19.99 * 100` ne vaut pas 1999 exactement : travaille en centimes entiers.
- **Oublier que `NaN` contamine un calcul.** Un seul `NaN` en entrée rend tout le résultat `NaN`, sans erreur.
- **`float32` « pour économiser ».** Tu perds la précision, tu ne gagnes presque rien.

## À retenir

- Flottants : `float64` par défaut, approximations IEEE 754, pas de `%`, pas de panic en cas de division par zéro (`±Inf`, `NaN`).
- On ne compare pas deux flottants avec `==` : on teste `|a − b| <= epsilon`.
- L'argent se calcule en entiers (centimes), pas en flottants.
- `string` : immuable, valeur zéro `""`, comparable, concaténable ; `rune` = un caractère (alias de `int32`).
