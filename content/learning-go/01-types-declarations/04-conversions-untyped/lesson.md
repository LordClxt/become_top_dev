---
id: go-ch01-l04
title: "Conversions explicites et littéraux non typés"
source: { chapter: 2, pages: "50-52" }
duration_min: 20
concepts:
  - id: go-explicit-conversion
    label: "Conversions de type toujours explicites"
  - id: go-untyped-literals
    label: "Les littéraux et constantes ne sont pas typés"
glossary:
  - term: "conversion de type"
    definition: "Écriture T(x) qui produit une valeur de type T à partir de x. Go n'en fait jamais d'implicite entre types distincts."
  - term: "promotion automatique"
    definition: "Conversion silencieuse d'un type numérique vers un autre dans une expression (pratique courante en C ou Java, absente de Go)."
  - term: "troncature"
    definition: "Perte de la partie décimale ou des bits de poids fort lors d'une conversion vers un type plus petit."
  - term: "type par défaut"
    definition: "Type qu'un littéral prend quand rien ne précise celui qu'on veut : int, float64, rune ou string."
visuals: [go-ch01-untyped-constants]
labs: [go-ch01-l04-lab-convert]
xp: 25
---

## Pourquoi c'est important

Beaucoup de langages convertissent les nombres tout seuls (« promotion automatique ») : `int + float` donne un `float`, `byte + int` donne un `int`. C'est confortable… jusqu'au jour où les règles produisent un résultat que personne n'attendait. Go a fait le choix inverse : **rien n'est converti sans que tu l'écrives**. Tu perds quelques mots de plus, tu gagnes un code dont le comportement se lit.

## Toute conversion est explicite

```go
var x int = 10
var y float64 = 30.2

sum1 := float64(x) + y   // 40.2 : on convertit x en float64
sum2 := x + int(y)       // 40   : on convertit y en int, la partie décimale disparaît
```

`x + y` ne compile pas : `invalid operation: mismatched types int and float64`. Même règle entre entiers de tailles différentes :

```go
var count int = 10
var small byte = 100
total := count + int(small)   // il faut choisir un côté
```

### Ce qui se passe à la conversion

- **Flottant → entier** : la partie décimale est supprimée, en **tronquant vers zéro**. `int(-2.7)` vaut `-2`, pas `-3`. Pour arrondir, utilise `math.Round`, `math.Floor` ou `math.Ceil` d'abord.
- **Entier → entier plus petit** : seuls les bits de poids faible sont conservés, sans erreur. `byte(300)` appliqué à une *variable* vaut `44` (300 modulo 256).
- **Entier → flottant** : exact jusqu'à 2⁵³ pour un `float64`, au-delà il peut perdre des chiffres.

```go
n := 300
fmt.Println(byte(n))        // 44 : conversion à l'exécution, pas d'erreur
fmt.Println(byte(300))      // erreur de compilation : la constante déborde
```

> **Habitude pro.** Quand une conversion peut perdre de l'information et que la valeur vient de l'extérieur (fichier, réseau, utilisateur), **vérifie la plage avant de convertir**. C'est exactement le travail du TP de cette leçon.

### Pas de conversion vers `bool`

Aucun type ne se convertit en `bool`, ni implicitement ni avec `bool(x)`. On écrit une comparaison : `n != 0`, `s == ""`, `p != nil`.

### Les pièges de string

`string(65)` ne produit pas `"65"` mais `"A"` : un entier converti en string est interprété comme un point de code. `go vet` te prévient. Pour afficher un nombre, utilise `strconv.Itoa` ou `fmt.Sprint`.

## Les littéraux sont non typés

Pourtant, ceci compile sans aucune conversion :

```go
var f float64 = 10        // le littéral 10 devient un float64
var y float64 = 200.3 * 5 // 5 est un littéral : pas de conversion à écrire
```

Un **littéral** (et, on le verra, une constante non typée) n'a pas de type propre : il prend celui que le contexte demande, tant que la valeur y tient.

```go
var b byte = 100     // OK : 100 tient dans un byte
var i int8 = 200     // erreur : 200 déborde int8
var s string = 65    // erreur : un nombre n'est pas une string
var n int = 3.5      // erreur : 3.5 n'est pas un entier
```

::visual{id="go-ch01-untyped-constants"}

Quand rien ne précise le type, le littéral prend son **type par défaut** :

| Littéral | Type par défaut |
|---|---|
| `42` | `int` |
| `3.14` | `float64` |
| `'x'` | `rune` |
| `"go"` | `string` |

C'est aussi pour ça que `7 / 2` vaut `3` (deux littéraux entiers, division entière) et `7 / 2.0` vaut `3.5` (un des deux est un flottant).

## Pièges fréquents

- **Convertir sans vérifier la plage.** `int8(n)` sur une valeur inconnue fait le tour en silence.
- **Oublier de convertir avant de diviser.** `float64(total / count)` tronque *avant* de convertir ; écris `float64(total) / float64(count)`.
- **`string(n)` pour afficher un entier.** Utilise `strconv.Itoa(n)`.
- **Croire qu'un littéral a un type.** `x := 10` donne un `int` parce que `int` est le type par défaut, pas parce que `10` était un `int`.

## À retenir

- Go ne convertit jamais deux types différents tout seul : écris `T(x)`.
- Flottant → entier tronque vers zéro ; entier → plus petit entier garde les bits de poids faible, sans erreur.
- Rien ne se convertit en `bool` : on écrit une comparaison.
- Les littéraux n'ont pas de type : ils s'adaptent à leur contexte et retombent sur `int`, `float64`, `rune` ou `string` par défaut.
