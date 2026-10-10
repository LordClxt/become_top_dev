---
id: go-ch03-l04
title: "switch, labels et goto"
source: { chapter: 4, pages: "106-116" }
duration_min: 30
concepts:
  - id: go-switch
    label: "switch : pas de fallthrough, cas multiples, cas vide"
  - id: go-blank-switch
    label: "Le switch sans expression et le choix entre switch et if"
  - id: go-labels
    label: "Les labels avec break et continue, notamment un switch dans un for"
  - id: go-goto
    label: "goto et ses restrictions"
glossary:
  - term: "fallthrough"
    definition: "Mot-clé qui fait continuer l'exécution dans le case suivant. Il n'est jamais implicite en Go."
  - term: "blank switch"
    definition: "switch sans expression à comparer : chaque case est une condition booléenne libre."
  - term: "label"
    definition: "Nom suivi de deux-points qui précède un for, un switch ou une instruction, pour désigner la cible d'un break, d'un continue ou d'un goto."
  - term: "garde"
    definition: "Condition qui écarte tôt un cas particulier pour que le reste du code reste simple."
visuals: []
labs: [go-ch03-l04-lab-switches]
xp: 35
---

## Pourquoi c'est important

Dans beaucoup de langages, les développeurs évitent `switch` à cause du `break` à répéter et du fallthrough par défaut. Go corrige ces deux défauts, et le `switch` devient l'outil le plus lisible pour des cas liés entre eux. Cette leçon couvre aussi les **labels** (indispensables pour sortir d'une boucle depuis un `switch`) et `goto`, que tu n'utiliseras presque jamais mais que tu dois savoir lire.

## `switch`

```go
words := []string{"a", "cow", "smile", "gopher", "anthropologist"}
for _, word := range words {
	switch size := len(word); size {
	case 1, 2, 3, 4:
		fmt.Println(word, "est un mot court")
	case 5:
		fmt.Println(word, "a la longueur idéale :", size)
	case 6, 7, 8, 9:
		// rien
	default:
		fmt.Println(word, "est un mot long")
	}
}
```

Ce qu'il faut remarquer :

- **Pas de parenthèses**, et on peut déclarer une variable locale (`size := …;`) valable dans tous les `case`, comme pour `if`.
- Chaque `case` est son **propre bloc** : sans accolades, on peut y déclarer des variables qui disparaissent à la fin du case.
- **Pas de `break` à écrire** : un case se termine tout seul. Les cases ne « tombent » pas dans le suivant.
- **Plusieurs valeurs** : `case 1, 2, 3, 4:` regroupe les cas qui font la même chose.
- **Un case vide ne fait rien.** Ici, les mots de 6 à 9 lettres n'affichent rien. Ce n'est pas un fallthrough.

Tu peux faire un `switch` sur tout type **comparable avec `==`** : les types de base, les pointeurs, les structs dont tous les champs sont comparables. Pas sur les slices, les maps, les fonctions.

### `fallthrough` : sache qu'il existe

```go
switch n {
case 1:
	fmt.Print("a")
	fallthrough   // continue dans le case suivant, sans tester sa condition
case 2:
	fmt.Print("b")
}
```

Le mot-clé existe, mais s'en servir signale presque toujours une logique à remanier : si un case dépend de la fin d'un autre, extrais le code partagé dans une fonction.

### Le piège du `break` dans un `switch` dans un `for`

Dans un `switch`, `break` sort **du switch**, pas de la boucle qui l'entoure.

```go
for i := 0; i < 10; i++ {
	switch i {
	case 3:
		fmt.Println("on quitte la boucle ?")
		break                       // sort du switch seulement !
	default:
		fmt.Println(i, "est banal")
	}
}
// La boucle continue : 4, 5, 6, … s'affichent encore
```

Pour sortir de la boucle, il faut un **label**.

## Les labels

Un label est un nom suivi de `:` placé devant une boucle. Il sert de cible à `break` et `continue` :

```go
loop:
	for i := 0; i < 10; i++ {
		switch i {
		case 3:
			break loop       // sort de la boucle for
		default:
			fmt.Println(i)
		}
	}
```

`gofmt` aligne les labels sur le bloc englobant, pour les rendre visibles. `continue label` passe au tour suivant de la boucle **nommée**, utile pour abandonner l'élément extérieur en cours :

```go
outer:
	for _, row := range grid {
		for _, v := range row {
			if v <= 0 {
				continue outer      // cette ligne est invalide : on passe à la suivante
			}
		}
		fmt.Println("ligne valide :", row)   // atteint seulement si aucun v <= 0
	}
```

Ce schéma (« abandonner l'itération extérieure dès qu'un élément intérieur échoue ») est le principal usage des labels. Ils restent rares.

## Le `switch` sans expression

On peut omettre l'expression à comparer : chaque `case` devient alors une condition booléenne arbitraire.

```go
switch n := len(word); {
case n < 5:
	fmt.Println(word, "est court")
case n > 10:
	fmt.Println(word, "est long")
default:
	fmt.Println(word, "a la bonne taille")
}
```

C'est une chaîne de `if/else if` mieux alignée, dont les cas sont lisiblement liés. Si **tous** tes cas comparent la même variable à une valeur (`case a == 2:`, `case a == 3:`…), passe à un `switch a { case 2: … }` normal : c'est plus court.

### `switch` ou `if` ?

Techniquement, rien ne les distingue. Mais un `switch` (même sans expression) **signale que les cas forment un ensemble lié**. Version FizzBuzz, la plus lisible de toutes :

```go
for i := 1; i <= 100; i++ {
	switch {
	case i%3 == 0 && i%5 == 0:
		fmt.Println("FizzBuzz")
	case i%3 == 0:
		fmt.Println("Fizz")
	case i%5 == 0:
		fmt.Println("Buzz")
	default:
		fmt.Println(i)
	}
}
```

Plus de `continue`, le cas par défaut est explicite. À l'inverse, pour des tests sans rapport entre eux, reste sur des `if` successifs.

## `goto`

Oui, Go a un `goto`. Il saute à une ligne étiquetée de la même fonction, avec des garde-fous que les anciens langages n'avaient pas : **pas de saut par-dessus une déclaration de variable**, **pas de saut vers l'intérieur d'un bloc**.

```go
a := 10
goto skip      // erreur : goto skip jumps over declaration of b
b := 20
skip:
```

La plupart du temps, `break` et `continue` avec label suffisent. Le seul cas où `goto` éclaire le code : quand plusieurs sorties anticipées d'une fonction doivent toutes passer par un même bloc de fin, et que ni drapeau booléen ni duplication de code n'est satisfaisant. La bibliothèque standard en fait un usage ponctuel dans `strconv`.

```go
for a < 100 {
	if a%5 == 0 {
		goto done
	}
	a = a*2 + 1
}
fmt.Println("la boucle s'est terminée normalement")
done:
fmt.Println("à exécuter dans tous les cas")
```

> **Habitude pro.** Écris `goto` seulement après avoir essayé de restructurer. Si un relecteur doit réfléchir pour comprendre le saut, une fonction auxiliaire fera mieux.

## Pièges fréquents

- **`break` dans un `case` d'un `switch` dans un `for`** qui ne quitte que le `switch`. Nomme la boucle avec un label.
- **Attendre un fallthrough** : un `case` vide ne fait rien, il ne descend pas dans le suivant.
- **Un `switch` sans expression dont tous les cas testent `x == …`** : écris un `switch x`.
- **Oublier `default`** quand tous les cas doivent être couverts : sans lui, une valeur imprévue passe en silence.

## À retenir

- Les `case` ne tombent pas dans le suivant ; on regroupe les valeurs avec des virgules ; un case vide ne fait rien.
- `break` dans un `switch` quitte le `switch` : utilise un label pour quitter la boucle extérieure.
- Le `switch` sans expression remplace avantageusement une chaîne de `if` liés ; les `if` restent pour des tests indépendants.
- `continue label` abandonne l'élément de la boucle extérieure ; `goto` est un dernier recours aux règles strictes.
