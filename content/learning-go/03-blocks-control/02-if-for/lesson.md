---
id: go-ch03-l02
title: "if et les formes de for"
source: { chapter: 4, pages: "95-102" }
duration_min: 25
concepts:
  - id: go-if-scoped
    label: "if avec une variable limitée à sa portée"
  - id: go-for-forms
    label: "Les quatre formes de for : complète, condition seule, infinie, range"
  - id: go-break-continue
    label: "break, continue et l'équivalent du do-while"
glossary:
  - term: "instruction d'initialisation"
    definition: "Petite instruction avant la condition d'un if, for ou switch, séparée par un point-virgule. Les variables qu'elle déclare n'existent que dans la structure."
  - term: "boucle infinie"
    definition: "for sans condition : elle tourne jusqu'à un break, un return ou un panic."
  - term: "garde (guard clause)"
    definition: "if placé en tête de fonction ou de boucle qui traite le cas particulier et sort tout de suite, pour garder le reste du code aligné à gauche."
visuals: []
labs: [go-ch03-l02-lab-loops]
xp: 30
---

## Pourquoi c'est important

`if` et `for` sont les deux briques de toute logique. Go les simplifie volontairement (une seule boucle, pas de parenthèses) et leur ajoute un détail précieux : une portée réduite pour les variables temporaires. Ce que tu retiens ici sert dans chaque fonction que tu écriras.

## `if`

Aucune parenthèse autour de la condition, mais les accolades sont **obligatoires**, même pour une seule ligne :

```go
if n == 0 {
	fmt.Println("vide")
} else if n > 5 {
	fmt.Println("grand")
} else {
	fmt.Println("petit")
}
```

### La variable limitée à l'if

Go permet de déclarer, avant la condition, une variable qui existe pour **tout** le `if` (condition, corps et branches `else`) et nulle part ailleurs :

```go
if n := rand.Intn(10); n == 0 {
	fmt.Println("trop bas")
} else if n > 5 {
	fmt.Println("trop haut :", n)   // n est encore visible
} else {
	fmt.Println("parfait :", n)
}
fmt.Println(n)   // erreur : undefined: n
```

Pourquoi c'est utile : une variable qui n'a servi qu'à cette décision ne pollue pas le reste de la fonction, et personne ne peut la réutiliser par erreur. C'est le style idiomatique pour les erreurs :

```go
if err := save(user); err != nil {
	return err
}
```

> **Habitude pro.** Réserve cette forme aux **nouvelles variables**. Mettre un appel ou une affectation à une variable existante avant la condition est légal, mais déroutant.

Comme toujours, cette variable est dans un bloc : elle **masque** une variable du même nom déclarée dehors.

## `for` : un seul mot-clé, quatre formes

Go n'a ni `while` ni `do`. Le mot `for` couvre tous les cas.

### 1. La forme complète

```go
for i := 0; i < 10; i++ {
	fmt.Println(i)
}
```

Trois parties : **initialisation** (obligatoirement avec `:=`, pas `var`), **condition** (évaluée avant chaque tour), **incrément** (après chaque tour, n'importe quelle affectation). Tu peux omettre l'initialisation ou l'incrément :

```go
i := 0
for ; i < 10; i++ { … }          // initialisation calculée avant
for i := 0; i < 10; { … }        // incrément décidé dans le corps
```

### 2. Condition seule : le « while »

Sans initialisation ni incrément, on retire aussi les points-virgules :

```go
n := 27
for n != 1 {
	if n%2 == 0 {
		n /= 2
	} else {
		n = 3*n + 1
	}
}
```

### 3. Boucle infinie

```go
for {
	line, ok := next()
	if !ok {
		break
	}
	process(line)
}
```

Le corps doit contenir un `break`, un `return` ou un `panic` : en vrai, on borne toujours une boucle.

### 4. `for-range`

Pour parcourir slices, maps, strings, channels : voir la leçon suivante.

## `break` et `continue`

`break` sort de la boucle, `continue` passe au tour suivant. Ils concernent **la boucle la plus intérieure**.

### Pas de `do-while` : une boucle infinie avec un `if`

Pour exécuter le corps **au moins une fois**, on écrit une boucle infinie qui se termine par la condition de sortie :

```go
for {
	attempt++
	if connect() == nil {
		break
	}
}
```

Remarque l'inversion : en Java on écrit la condition pour *rester* dans la boucle, en Go on écrit celle pour *en sortir*.

### `continue` pour aplatir le code

Compare ces deux versions :

```go
// Imbriqué : difficile à suivre
for i := 1; i <= 100; i++ {
	if i%3 == 0 {
		if i%5 == 0 {
			fmt.Println("FizzBuzz")
		} else {
			fmt.Println("Fizz")
		}
	} else if i%5 == 0 {
		fmt.Println("Buzz")
	} else {
		fmt.Println(i)
	}
}

// Aplati avec continue : chaque cas se lit seul
for i := 1; i <= 100; i++ {
	if i%3 == 0 && i%5 == 0 {
		fmt.Println("FizzBuzz")
		continue
	}
	if i%3 == 0 {
		fmt.Println("Fizz")
		continue
	}
	if i%5 == 0 {
		fmt.Println("Buzz")
		continue
	}
	fmt.Println(i)
}
```

Go préfère un code **court et aligné à gauche** : des cas traités tôt et abandonnés, plutôt qu'un empilement de `else`. (La leçon sur `switch` montre une version encore plus lisible.)

> **Au-delà du livre.** Depuis Go 1.22, `for i := range 10` parcourt les entiers de 0 à 9. C'est la forme à préférer quand tu n'as pas besoin de l'initialisation ni de l'incrément personnalisés : `for range 3 { … }` répète un corps trois fois sans variable.

## Pièges fréquents

- **Parenthèses autour des conditions.** `if (x > 3) {` compile (les parenthèses sont de simples sous-expressions) mais `gofmt` les retire et le style les refuse.
- **`var` dans l'initialisation du `for`.** Seul `:=` est autorisé.
- **Boucle infinie sans sortie.** Un `for {}` sans `break` ni `return` bloque le programme.
- **`else` après un `return`.** Si le bloc `if` se termine par `return`, n'écris pas de `else` : la suite du code *est* le else.
- **Modifier la variable de boucle dans le corps** (hors incrément). C'est légal, c'est rarement une bonne idée.

## À retenir

- `if` et `for` n'ont pas de parenthèses ; les accolades sont obligatoires.
- `if v := f(); cond { … }` limite `v` au `if` et à ses `else`.
- Un seul mot-clé de boucle, `for`, quatre formes : complète, condition seule, infinie, `range`.
- `do-while` s'écrit `for { …; if !cond { break } }`.
- `continue` et les sorties anticipées gardent le code plat et lisible.
