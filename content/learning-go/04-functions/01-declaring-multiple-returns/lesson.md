---
id: go-ch04-l01
title: "Déclarer une fonction, retourner plusieurs valeurs"
source: { chapter: 5, pages: "117-123" }
duration_min: 25
concepts:
  - id: go-func-decl
    label: "Déclaration et appel d'une fonction"
  - id: go-options-struct
    label: "Pas de paramètres nommés ni optionnels : une struct d'options"
  - id: go-variadic
    label: "Paramètres variadiques"
  - id: go-multi-return
    label: "Valeurs de retour multiples et convention de l'erreur en dernier"
  - id: go-named-returns
    label: "Valeurs de retour nommées et pourquoi éviter le retour nu"
glossary:
  - term: "signature"
    definition: "Nom, paramètres et valeurs de retour d'une fonction. Deux fonctions de même forme ont le même type."
  - term: "variadique"
    definition: "Se dit d'un paramètre qui accepte un nombre quelconque de valeurs, écrit ...T. Dans la fonction, c'est une slice []T."
  - term: "retour nu (blank / naked return)"
    definition: "Un return sans valeurs dans une fonction à retours nommés : il renvoie les valeurs courantes des variables nommées."
  - term: "comma ok / (valeur, erreur)"
    definition: "Convention Go : une fonction renvoie sa valeur puis, en dernier, une erreur (ou un booléen) qui dit si ça a marché."
visuals: []
labs: [go-ch04-l01-lab-signatures]
xp: 30
---

## Pourquoi c'est important

Le code Go est fait de petites fonctions qui retournent souvent **deux choses** : un résultat et une erreur. C'est le rythme de tout programme Go, et les conventions autour de cette écriture (erreur en dernier, valeur ignorée par `_`, struct d'options) forment un vocabulaire que tous les projets partagent. Cette leçon met en place ce vocabulaire.

## Déclarer et appeler

```go
func div(num, denom int) int {
	if denom == 0 {
		return 0
	}
	return num / denom
}
```

Quatre éléments : le mot-clé `func`, le **nom**, les **paramètres** entre parenthèses (nom d'abord, type ensuite), et le **type de retour** juste avant l'accolade. Deux paramètres consécutifs du même type se regroupent : `num, denom int`.

- Une fonction qui retourne une valeur doit finir par un `return` sur tous ses chemins.
- Une fonction sans retour n'écrit rien après les parenthèses, et n'a pas besoin de `return` (sauf pour sortir plus tôt).
- `main` n'a ni paramètres ni retour.

## Pas de paramètres nommés ni optionnels

Go n'offre ni `div(denom: 2, num: 10)` ni valeurs par défaut. Pour une fonction qui en a vraiment besoin, on passe **une struct** dont les champs jouent le rôle de paramètres nommés :

```go
type Options struct {
	FirstName string
	LastName  string
	Age       int
}

func Register(opts Options) error { … }

Register(Options{LastName: "Patel", Age: 50})   // FirstName reste ""
Register(Options{FirstName: "Joe", LastName: "Smith"})
```

Les champs omis valent leur **valeur zéro** : c'est pourquoi on prépare des valeurs zéro utiles. Si une fonction a besoin de beaucoup de paramètres, c'est souvent le signe qu'elle fait trop de choses.

## Les paramètres variadiques

`fmt.Println` accepte autant d'arguments qu'on veut. Tu peux écrire pareil avec `...` devant le type du **dernier** paramètre :

```go
func addTo(base int, vals ...int) []int {
	out := make([]int, 0, len(vals))
	for _, v := range vals {
		out = append(out, base+v)
	}
	return out
}

addTo(3)                  // []   : zéro valeur est permis
addTo(3, 2, 4, 6)         // [5 7 9]
nums := []int{4, 3}
addTo(3, nums...)         // [7 6] : les trois points « déplient » une slice
```

Dans la fonction, `vals` est une **slice** ordinaire (`nil` si aucun argument). Pour passer une slice existante, il faut les trois points derrière : `addTo(3, nums)` ne compile pas.

> **Piège.** Quand tu passes `nums...`, la fonction reçoit la **même** slice, pas une copie. Si elle la trie ou la modifie, l'appelant le voit. Copie avant de modifier (tu le vérifieras dans le TP).

## Plusieurs valeurs de retour

Go permet de renvoyer plusieurs valeurs. Leurs types se listent entre parenthèses :

```go
func divAndRemainder(num, denom int) (int, int, error) {
	if denom == 0 {
		return 0, 0, errors.New("division par zéro")
	}
	return num / denom, num % denom, nil
}
```

Trois règles :

1. On renvoie **toutes** les valeurs, séparées par des virgules, **sans parenthèses**.
2. Par convention, l'**erreur est toujours la dernière** valeur. En cas de succès, elle vaut `nil`.
3. À l'appel, on affecte **chaque** valeur à sa variable : il n'existe pas de tuple.

```go
quotient, remainder, err := divAndRemainder(5, 2)
if err != nil {
	return err
}
```

Si tu n'as pas besoin d'une valeur, ignore-la avec `_` : `quotient, _, err := divAndRemainder(5, 2)`. Mettre le résultat de plusieurs valeurs dans une seule variable est une erreur de compilation, contrairement à Python.

Appeler une fonction en jetant **tout** son résultat est légal (`fmt.Println` renvoie deux valeurs que l'on ignore toujours), mais dans presque tous les autres cas, on écrit `_` pour montrer qu'on ignore volontairement.

## Les valeurs de retour nommées

On peut nommer les valeurs de retour. Ce sont alors des **variables locales prédéclarées**, à leur valeur zéro :

```go
func divAndRemainder(num, denom int) (result, remainder int, err error) {
	if denom == 0 {
		err = errors.New("division par zéro")
		return result, remainder, err
	}
	result, remainder = num/denom, num%denom
	return result, remainder, err
}
```

Elles servent de documentation, et sont **indispensables dans un cas précis** (modifier la valeur renvoyée depuis un `defer`, voir la leçon dédiée). Mais elles ont deux pièges :

- **Le shadowing.** Un `result, err := …` dans un bloc interne crée de nouvelles variables : on croit assigner la valeur de retour, on assigne une copie locale.
- **Elles ne sont pas obligatoires.** `return 1, 2, nil` fonctionne même si les variables nommées valent autre chose : le compilateur copie ce que tu renvoies dans les noms.

Le nom est local à la fonction : l'appelant nomme ce qu'il reçoit comme il veut.

> **Évite les noms `min`, `max`, `len`…** pour tes retours nommés ou tes variables : ce sont des identifiants prédéclarés, et tu les masquerais (voir la leçon sur le shadowing).

### Le retour nu : à ne jamais utiliser

Avec des retours nommés, `return` seul est autorisé : il renvoie les valeurs courantes des variables.

```go
func divAndRemainder(num, denom int) (result, remainder int, err error) {
	if denom == 0 {
		err = errors.New("division par zéro")
		return              // retour nu
	}
	result, remainder = num/denom, num%denom
	return
}
```

C'est compact, mais le lecteur doit remonter dans la fonction pour savoir **ce qui est vraiment renvoyé**. Les développeurs Go expérimentés le considèrent comme une erreur de conception. **Si ta fonction retourne des valeurs, ne l'utilise jamais.**

## Pièges fréquents

- **`addTo(3, nums)`** au lieu de `addTo(3, nums...)`.
- **Modifier la slice variadique** reçue via `xs...` : l'appelant voit le changement.
- **Oublier de tester `err`** juste après l'appel.
- **Retours nommés + `:=`** dans un bloc : on assigne une copie, pas la valeur de retour.
- **Retour nu** dans une fonction de plus de quelques lignes.

## À retenir

- Déclaration : `func nom(params) retour { … }` ; paramètres du même type regroupés.
- Ni paramètres nommés ni optionnels : une struct d'options, dont les champs omis valent leur zéro.
- `...T` pour le dernier paramètre ; une slice se déplie avec `xs...`.
- Plusieurs retours, l'erreur en dernier ; `_` pour ignorer ; pas de tuple.
- Retours nommés : utiles pour `defer`, risqués ailleurs ; retour nu : jamais.
