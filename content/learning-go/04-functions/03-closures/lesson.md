---
id: go-ch04-l03
title: "Closures : des fonctions qui retiennent leur environnement"
source: { chapter: 5, pages: "129-133" }
duration_min: 25
concepts:
  - id: go-closure-capture
    label: "Une closure lit et modifie les variables de la fonction englobante"
  - id: go-closure-state
    label: "Une closure garde un état entre deux appels"
  - id: go-func-param
    label: "Passer une fonction en paramètre (sort.Slice)"
  - id: go-func-return
    label: "Renvoyer une fonction depuis une fonction"
glossary:
  - term: "closure"
    definition: "Fonction déclarée dans une autre fonction, qui peut lire et modifier les variables de celle-ci, même après son retour."
  - term: "capture"
    definition: "Le fait qu'une closure garde une référence aux variables extérieures qu'elle utilise (pas une copie de leur valeur)."
  - term: "fonction d'ordre supérieur"
    definition: "Fonction qui reçoit une fonction en paramètre ou qui en renvoie une."
  - term: "fabrique (factory)"
    definition: "Fonction qui construit et renvoie un objet configuré, ici une autre fonction (makeMult(3))."
visuals: []
labs: [go-ch04-l03-lab-closures]
xp: 30
---

## Pourquoi c'est important

Les closures sont l'une des raisons pour lesquelles les fonctions comme valeurs sont si utiles. Elles permettent de **fabriquer** des fonctions sur mesure, de les **configurer** avec des données, et de leur faire **garder un état**. On les rencontre partout en Go : tri personnalisé, middlewares HTTP, nettoyage avec `defer`, goroutines, options fonctionnelles.

## Capturer des variables

Une fonction déclarée dans une fonction voit les variables de son **environnement** et peut les modifier :

```go
func main() {
	a := 20
	f := func() {
		fmt.Println(a)  // 20 : lit a, déclarée à l'extérieur
		a = 30          // modifie a
	}
	f()
	fmt.Println(a)      // 30
}
```

`a` n'est pas passée en paramètre : la closure l'**a capturée**. Ce n'est pas une copie : la closure et la fonction extérieure partagent la **même** variable.

### Attention à `:=`

Comme partout, `:=` crée une nouvelle variable qui masque l'ancienne :

```go
a := 20
f := func() {
	fmt.Println(a)  // 20
	a := 30         // nouvelle variable, locale à la closure
	fmt.Println(a)  // 30
}
f()
fmt.Println(a)      // 20 : inchangée
```

Dans une closure, vérifie toujours si tu veux **modifier** (`=`) ou **déclarer** (`:=`).

## À quoi servent-elles ?

Même seules, les closures permettent deux choses :

- **Limiter la portée** : une petite fonction appelée plusieurs fois par une seule autre fonction peut vivre à l'intérieur, au lieu d'encombrer le package de noms.
- **Supprimer une répétition** : un bout de logique répété dans une fonction devient une closure locale qui capture ce dont elle a besoin.

Elles deviennent vraiment puissantes quand on les **passe** ou qu'on les **renvoie**.

## Passer une fonction en paramètre

Le paquet `sort` propose `sort.Slice`, qui trie n'importe quelle slice selon une fonction que tu fournis :

```go
type Person struct {
	FirstName string
	LastName  string
	Age       int
}

people := []Person{
	{"Pat", "Patterson", 37},
	{"Tracy", "Bobdaughter", 23},
	{"Fred", "Fredson", 18},
}

// tri par nom de famille
sort.Slice(people, func(i, j int) bool {
	return people[i].LastName < people[j].LastName
})

// tri par âge, avec la même slice
sort.Slice(people, func(i, j int) bool {
	return people[i].Age < people[j].Age
})
```

La closure reçoit deux **indices** `i` et `j`, mais elle utilise `people`, qu'elle a capturée, pour comparer les éléments. Même donnée, deux ordres : on change le comportement en changeant la fonction.

> **Au-delà du livre.** Depuis Go 1.21, `slices.SortFunc(people, func(a, b Person) int { … })` est la forme moderne : la fonction reçoit directement les deux **éléments** (pas les indices) et renvoie un entier négatif, nul ou positif (`cmp.Compare(a.Age, b.Age)`). C'est plus sûr et plus rapide, et c'est ce que tu utiliseras dans du code récent.

## Renvoyer une fonction

Une fonction peut en fabriquer une autre :

```go
func makeMult(base int) func(int) int {
	return func(factor int) int {
		return base * factor
	}
}

twoBase := makeMult(2)
threeBase := makeMult(3)
for i := 0; i < 3; i++ {
	fmt.Println(twoBase(i), threeBase(i))   // 0 0, 2 3, 4 6
}
```

Chaque appel à `makeMult` crée un **nouvel** environnement : `twoBase` retient `base = 2`, `threeBase` retient `base = 3`. La variable `base` vit tant qu'une closure l'utilise, même après le retour de `makeMult`.

### L'état d'une closure

Si la closure **modifie** une variable capturée, cet état persiste entre ses appels :

```go
func counter() func() int {
	n := 0
	return func() int {
		n++
		return n
	}
}

a, b := counter(), counter()
fmt.Println(a(), a(), a(), b())   // 1 2 3 1
```

`a` et `b` ont chacune **leur** `n` : deux compteurs indépendants. C'est un moyen simple d'avoir un état privé sans définir de type.

## Les boucles et les closures

Depuis Go 1.22, chaque tour de boucle a **sa propre** variable. Les closures créées dans une boucle `for` capturent donc chacune une valeur différente :

```go
var fs []func() int
for i := 0; i < 3; i++ {
	fs = append(fs, func() int { return i * i })
}
// Go 1.22+ : 0, 1, 4 (avant : 4, 4, 4)
```

Si tu maintiens un module plus ancien (`go 1.21` dans le `go.mod`), passe la valeur en paramètre ou copie-la : `i := i`.

## Pièges fréquents

- **Confondre capture et copie.** Une closure voit les modifications ultérieures de la variable, et peut la modifier.
- **`:=` à la place de `=`** dans la closure : on crée une variable locale au lieu de modifier celle de l'extérieur.
- **Anciens modules et boucles** : avant Go 1.22, toutes les closures d'une boucle partageaient la même variable.
- **État partagé sans le savoir** : plusieurs goroutines qui utilisent une même closure avec état créent une course de données (chapitre sur la concurrence).

## À retenir

- Une closure lit **et modifie** les variables de la fonction qui l'entoure, même après le retour de celle-ci.
- Elle partage ces variables (pas de copie) : c'est ce qui lui donne un état.
- Fabriquer une fonction avec `makeMult(3)` ou `counter()` donne des fonctions indépendantes.
- Passer une closure à `sort.Slice` (ou `slices.SortFunc`) change le comportement sans changer la donnée.
- Dans une closure, `=` modifie, `:=` masque.
