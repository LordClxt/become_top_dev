---
id: go-ch01-l01
title: "Valeur zéro, littéraux et booléens"
source: { chapter: 2, pages: "41-43" }
duration_min: 20
concepts:
  - id: go-zero-value
    label: "La valeur zéro de chaque type"
  - id: go-literals
    label: "Les littéraux : entiers, flottants, runes, strings"
  - id: go-bool
    label: "Le type bool et l'absence de « truthiness »"
glossary:
  - term: "valeur zéro"
    definition: "Valeur qu'a toute variable déclarée sans valeur explicite : 0, false, \"\" ou nil selon le type."
  - term: "littéral"
    definition: "Valeur écrite directement dans le code : 42, 3.14, 'a', \"texte\"."
  - term: "interpreted string"
    definition: "String entre guillemets doubles, où les séquences comme \\n et \\\" sont interprétées."
  - term: "raw string"
    definition: "String entre accents graves (`), où rien n'est interprété et où les retours à la ligne sont conservés."
  - term: "rune"
    definition: "Un point de code Unicode, écrit entre apostrophes : 'a', 'é', '世'."
visuals: [go-ch01-literal-bases]
labs: [go-ch01-l01-lab-literals]
xp: 25
---

## Pourquoi c'est important

Chaque programme commence par des valeurs brutes : un port, un délai, un message d'erreur. Savoir comment Go les écrit et ce qu'il met dans une variable que tu n'as pas initialisée évite toute une famille de bugs. En C, une variable non initialisée contient ce qui traînait en mémoire. En Go, **ça n'arrive jamais**.

## La valeur zéro

Une variable déclarée sans valeur reçoit automatiquement la **valeur zéro** de son type :

| Type | Valeur zéro |
|---|---|
| `int`, `float64`, `byte`… | `0` |
| `bool` | `false` |
| `string` | `""` (la chaîne vide) |
| pointeur, slice, map, fonction, interface | `nil` |

```go
var attempts int   // 0
var verbose bool   // false
var host string    // ""
```

Tu peux donc écrire du code dont le comportement par défaut est sûr : un compteur démarre à zéro, un drapeau est éteint. On parle souvent de **rendre la valeur zéro utile** : un type bien conçu fonctionne sans initialisation (on y reviendra avec les structs).

> **Habitude pro.** Quand tu veux la valeur zéro, écris `var x int` plutôt que `x := 0` : l'intention est visible. Tu en reparleras dans la leçon sur `var` et `:=`.

## Les littéraux

Un **littéral** est une valeur écrite telle quelle dans le code. Go en a quatre familles courantes.

### Entiers : plusieurs bases, un séparateur

```go
a := 1_234_567   // décimal, le _ sépare les milliers
b := 0b1010_0000 // binaire (préfixe 0b)
c := 0o755       // octal (préfixe 0o)
d := 0xDEAD_BEEF // hexadécimal (préfixe 0x)
```

Le `_` n'a aucun effet sur la valeur : c'est de la lisibilité. Il doit séparer deux chiffres : ni au début, ni à la fin, ni deux à la suite (`1__0` ne compile pas).

::visual{id="go-ch01-literal-bases"}

En pratique : écris en **décimal** par défaut. L'octal sert presque uniquement aux permissions Unix (`0o755`), l'hexadécimal et le binaire aux masques de bits et aux protocoles réseau.

### Flottants et runes

```go
pi := 3.14159
avogadro := 6.02e23   // notation scientifique
r := 'é'              // une rune : APOSTROPHES, un seul caractère
tab := '\t'           // séquences d'échappement : \n \t \\ \'
```

En Go, les apostrophes et les guillemets **ne sont pas interchangeables** : `'a'` est une rune (un nombre qui désigne un point de code), `"a"` est une string.

### Strings : deux écritures

```go
msg := "ligne 1\nligne 2 avec des \"guillemets\""   // interpreted : les \ sont interprétés
path := `C:\temp\nouveau`                            // raw : rien n'est interprété
```

- La **string interprétée** (guillemets doubles) comprend les échappements. Elle ne peut pas contenir de retour à la ligne brut ni de `"` non échappé.
- La **raw string** (accents graves) garde tout tel quel, y compris les retours à la ligne et les `\`. Parfaite pour du SQL multiligne, du JSON ou une expression régulière. Elle ne peut pas contenir d'accent grave.

```go
query := `SELECT id, name
FROM users
WHERE name = "ada"`
```

## Les booléens

`bool` n'a que deux valeurs, `true` et `false`, et sa valeur zéro est `false`.

```go
var done bool          // false
ready := true
```

Point important : **Go n'a pas de « truthiness »**. Un nombre, une string ou un pointeur ne se convertissent jamais en booléen, ni implicitement ni explicitement. Pas de `if count { … }` : on écrit la comparaison.

```go
if count != 0 { … }
if name == "" { … }
if user != nil { … }
```

C'est plus verbeux, mais la condition dit exactement ce qu'elle teste.

## Pièges fréquents

- **Zéro octal caché.** `010` vaut **8**, pas 10 : un zéro au début, sans lettre, désigne l'octal. Ne l'écris jamais ; utilise `0o10` si tu veux de l'octal.
- **Apostrophes à la place des guillemets.** `'bonjour'` ne compile pas : une rune n'est qu'un seul caractère.
- **`\n` dans une raw string.** Il reste littéral : deux caractères, `\` et `n`. `len(`a\nb`)` vaut 4.
- **Compter sur une initialisation.** Une variable déclarée est *toujours* initialisée à sa valeur zéro : inutile (et bruyant) d'écrire `var n int = 0`.

## À retenir

- Toute variable a une valeur zéro : `0`, `false`, `""` ou `nil`.
- Entiers : décimal par défaut, `0b`, `0o`, `0x` pour les autres bases, `_` pour la lisibilité.
- Rune = apostrophes, un caractère ; string = guillemets (interprétée) ou accents graves (raw).
- `bool` : `true`/`false`, zéro = `false`, et jamais de conversion implicite depuis un nombre ou une string.
