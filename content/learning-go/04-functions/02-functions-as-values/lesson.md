---
id: go-ch04-l02
title: "Les fonctions sont des valeurs"
source: { chapter: 5, pages: "123-129" }
duration_min: 25
concepts:
  - id: go-func-values
    label: "Une fonction est une valeur que l'on stocke, passe et renvoie"
  - id: go-func-types
    label: "Types fonction : signature et déclaration avec type"
  - id: go-anon-func
    label: "Fonctions anonymes, appelées sur place ou stockées"
glossary:
  - term: "signature"
    definition: "Le type d'une fonction : la liste des types de ses paramètres et de ses valeurs de retour (les noms ne comptent pas)."
  - term: "fonction anonyme"
    definition: "Fonction écrite sans nom, directement dans une expression : func(x int) int { return x * 2 }."
  - term: "table de dispatch"
    definition: "Map dont les valeurs sont des fonctions : on choisit le comportement par une clé (un opérateur, une commande) au lieu d'un gros switch."
  - term: "fonction d'ordre supérieur"
    definition: "Fonction qui prend une fonction en paramètre ou en renvoie une."
visuals: []
labs: [go-ch04-l02-lab-values]
xp: 30
---

## Pourquoi c'est important

En Go, une fonction n'est pas qu'un bloc de code que l'on appelle : c'est une **valeur** comme une autre. On peut la mettre dans une variable, dans une map, la passer à une autre fonction, la renvoyer. Cette seule idée explique le tri personnalisé, les middlewares HTTP, les callbacks, les options fonctionnelles… et rend possible de remplacer de longs `switch` par une simple table.

## Le type d'une fonction

Le type d'une fonction se compose du mot `func` et des types de ses paramètres et de ses retours : sa **signature**. Les noms des paramètres n'en font pas partie.

```go
func f1(a string) int { return len(a) }

func f2(a string) int {
	total := 0
	for _, v := range a {
		total += int(v)
	}
	return total
}

var myFunc func(string) int   // une variable qui peut contenir n'importe quelle func(string) int

myFunc = f1
fmt.Println(myFunc("Hello"))   // 5
myFunc = f2
fmt.Println(myFunc("Hello"))   // 500
```

Toute fonction qui a **exactement** le même nombre et les mêmes types de paramètres et de retours peut être affectée à `myFunc`. La valeur zéro d'une variable de type fonction est `nil` ; l'appeler **provoque un panic**.

## Une table de fonctions : la calculatrice

L'application classique : remplacer un `switch` sur une chaîne par une map de fonctions.

```go
func add(i, j int) int { return i + j }
func sub(i, j int) int { return i - j }
func mul(i, j int) int { return i * j }

var opMap = map[string]func(int, int) int{
	"+": add,
	"-": sub,
	"*": mul,
}

if op, ok := opMap[symbol]; ok {
	fmt.Println(op(2, 3))
} else {
	fmt.Println("opérateur non géré :", symbol)
}
```

On cherche la fonction par sa clé (avec l'idiome *comma ok* pour gérer l'absence), puis on l'appelle comme n'importe quelle fonction. L'avantage : **ajouter un opérateur, c'est ajouter une entrée dans la map**, sans toucher à la logique d'évaluation. C'est ce que fait le TP.

> **Ne sois pas fragile.** Dans cet exemple, 6 lignes font le calcul et 16 vérifient les entrées (nombre de termes, conversions, opérateur connu). C'est normal. La gestion rigoureuse des erreurs distingue le code de production du prototype.

### Donner un nom à un type de fonction

Quand une même signature revient souvent, on lui donne un nom avec `type` :

```go
type BinaryOp func(int, int) int

var opMap = map[string]BinaryOp{ "+": add, "-": sub }
```

Rien ne change pour les fonctions elles-mêmes : toute fonction de la bonne signature satisfait automatiquement le type. Le gain est la lisibilité (un nom au lieu d'une signature à rallonge), et plus tard un lien avec les interfaces.

## Les fonctions anonymes

On peut définir une fonction **à l'intérieur** d'une autre, sans nom :

```go
func main() {
	f := func(j int) {
		fmt.Println("valeur :", j)
	}
	for i := 0; i < 3; i++ {
		f(i)
	}
}
```

Pas de nom entre `func` et la parenthèse des paramètres. On peut aussi l'**appeler immédiatement**, avec des parenthèses après l'accolade fermante :

```go
for i := 0; i < 3; i++ {
	func(j int) {
		fmt.Println("valeur :", j)
	}(i)
}
```

Écrit ainsi, c'est inutile : autant mettre le code directement dans la boucle. Cette forme sert dans deux situations : `defer` et le lancement de **goroutines**, que l'on verra bientôt.

### Fonctions anonymes au niveau du package : sois prudent

On peut aussi affecter une fonction anonyme à une variable de package :

```go
var add = func(i, j int) int { return i + j }

func changeAdd() {
	add = func(i, j int) int { return i + j + j }   // légal !
}
```

Contrairement à une fonction déclarée avec `func add(…)`, cette variable peut être **réaffectée** : le sens de `add(2, 3)` change pendant que le programme tourne. C'est la pire sorte d'état global, car le code appelant ne le sait pas. N'utilise ce mécanisme que si tu en as vraiment besoin (par exemple, pour remplacer une dépendance dans un test) et garde l'état du package immuable autant que possible.

## Pièges fréquents

- **Appeler une variable fonction `nil`** : panic. Vérifie `if f != nil` quand elle est optionnelle.
- **Une signature presque identique** : `func(int, int) (int, error)` n'est **pas** un `func(int, int) int`.
- **Oublier les parenthèses** d'un appel immédiat : `func() { … }` seul est une valeur, pas un appel.
- **Fonction de package modifiable** : sources de bugs subtils et de tests qui s'influencent.

## À retenir

- Une fonction est une valeur : variable, champ, élément de map, argument, résultat.
- Son type est sa signature ; la valeur zéro est `nil` et l'appeler paniquerait.
- Une map de fonctions remplace un `switch` : on ajoute une entrée plutôt qu'un `case`.
- `type Nom func(…)` nomme une signature ; toute fonction de la bonne forme y correspond.
- Une fonction anonyme se définit sur place ; réserve l'appel immédiat à `defer` et aux goroutines.
