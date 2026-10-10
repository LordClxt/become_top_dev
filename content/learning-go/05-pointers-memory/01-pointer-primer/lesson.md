---
id: go-ch05-l01
title: "Les pointeurs : adresses, & et *"
source: { chapter: 6, pages: "143-147" }
duration_min: 25
concepts:
  - id: go-pointer-basics
    label: "Adresse (&) et déréférencement (*)"
  - id: go-nil-pointer
    label: "nil, la valeur zéro d'un pointeur, et le panic de son déréférencement"
  - id: go-new-and-literal
    label: "Créer un pointeur : &T{} et new"
  - id: go-pointer-to-constant
    label: "Pas d'adresse pour un littéral : variable ou fonction aide"
glossary:
  - term: "pointeur"
    definition: "Variable qui contient l'adresse mémoire d'une autre valeur au lieu de la valeur elle-même."
  - term: "adresse"
    definition: "Numéro de l'emplacement mémoire où une valeur est stockée."
  - term: "déréférencer"
    definition: "Suivre un pointeur pour lire ou écrire la valeur à laquelle il mène. Se note *p."
  - term: "nil"
    definition: "Valeur zéro d'un pointeur (et d'une slice, d'une map, d'une fonction…) : il ne désigne rien. Ce n'est pas un synonyme de 0."
visuals: []
labs: [go-ch05-l01-lab-primer]
xp: 25
---

## Pourquoi c'est important

Jusqu'ici, chaque variable que tu as manipulée contenait directement sa valeur, et chaque appel de fonction en faisait une copie. Les pointeurs ajoutent l'idée inverse : une variable qui **désigne** une autre. Ils servent à partager une donnée, à la modifier depuis une autre fonction, à représenter l'absence de valeur. Beaucoup de développeurs les redoutent ; en Go, ils sont bien plus simples qu'en C.

## Variables et adresses

Chaque variable occupe un ou plusieurs octets consécutifs en mémoire, repérés par une **adresse**. Un `int32` occupe quatre octets, un booléen un seul. Un **pointeur** est une variable dont la valeur est l'adresse d'une autre variable.

```go
var x int32 = 10
var y bool = true
pointerX := &x      // l'adresse de x
pointerY := &y      // l'adresse de y
var pointerZ *string  // pointe sur rien
```

Quel que soit le type visé, un pointeur occupe toujours la même taille (4 octets sur un système 32 bits, 8 sur un 64 bits). Sa **valeur zéro** est `nil`.

## Les deux opérateurs

- **`&`** (adresse de) précède une variable et renvoie son adresse.
- **`*`** (déréférencement) précède un pointeur et renvoie la valeur pointée.

```go
x := 10
pointerToX := &x
fmt.Println(pointerToX)   // une adresse, par exemple 0xc000012345
fmt.Println(*pointerToX)  // 10

*pointerToX = 20          // écrit dans x
fmt.Println(x)            // 20
z := 5 + *pointerToX      // 25
```

Le **type** d'un pointeur s'écrit avec une étoile devant le type visé : `*int` est « pointeur vers un `int` », `*Person` « pointeur vers une `Person` ». Copier un pointeur copie l'adresse : les deux variables désignent alors **la même valeur**.

```go
x := 1
p := &x
q := p       // q pointe aussi sur x
*q = 5
fmt.Println(x, *p)   // 5 5
```

### Pas d'arithmétique sur les pointeurs

Contrairement au C, Go interdit `p + 1`. Le ramasse-miettes gère la mémoire à ta place, et le paquet `unsafe` (réservé à des cas très rares) est le seul moyen de contourner cette règle.

## `nil` : le pointeur qui ne mène nulle part

```go
var x *int
fmt.Println(x == nil)  // true
fmt.Println(*x)        // panic : invalid memory address or nil pointer dereference
```

**Avant de déréférencer un pointeur dont tu n'es pas sûr, vérifie qu'il n'est pas `nil`.** Un déréférencement de `nil` fait paniquer le programme : c'est l'erreur d'exécution la plus courante en Go.

Contrairement à `NULL` en C, `nil` n'est **pas** un autre nom pour `0` : on ne peut pas les convertir l'un en l'autre. Et comme `nil` est un identifiant du bloc univers, il peut être masqué : ne nomme jamais une variable `nil`.

## Créer un pointeur

Trois manières :

```go
x := 10
p := &x                   // pointeur vers une variable existante

q := &Person{Name: "Ada"} // pointeur vers une struct créée à la volée : la forme habituelle

r := new(int)             // pointeur vers un int à sa valeur zéro (0)
fmt.Println(*r)           // 0
```

`new` est rarement utilisé : pour une struct on écrit `&Person{…}`, pour une valeur simple on déclare une variable et on prend son adresse.

### Accéder aux champs d'une struct pointée

Go déréférence automatiquement pour les champs :

```go
t := &T{N: 1}
t.N++               // identique à (*t).N++
fmt.Println(t.N)    // 2
```

## On ne peut pas prendre l'adresse d'un littéral

Les nombres, booléens et strings écrits dans le code n'ont pas d'adresse : ils n'existent qu'à la compilation.

```go
type person struct {
	FirstName  string
	MiddleName *string
	LastName   string
}

p := person{
	FirstName:  "Pat",
	MiddleName: "Perry",    // erreur : cannot use "Perry" as *string
	LastName:   "Peterson",
}
// MiddleName: &"Perry"     // erreur aussi : cannot take the address of "Perry"
```

Deux solutions. La première : déclarer une variable.

```go
middle := "Perry"
p := person{FirstName: "Pat", MiddleName: &middle, LastName: "Peterson"}
```

La seconde : une petite fonction **générique** qui renvoie un pointeur vers une copie de n'importe quelle valeur.

```go
func makePointer[T any](t T) *T {
	return &t
}

p := person{FirstName: "Pat", MiddleName: makePointer("Perry"), LastName: "Peterson"}
```

Ça marche parce qu'un paramètre est une variable : elle a une adresse, que la fonction renvoie. (Les génériques seront détaillés dans un prochain module ; ici, retiens simplement le modèle.) C'est ce que tu écris dans le TP, sous le nom `Ptr`.

## Pièges fréquents

- **Déréférencer un pointeur `nil`.** Teste `if p != nil` quand le pointeur peut être absent.
- **Confondre `p` et `*p`** : `p == q` compare des adresses, `*p == *q` compare des valeurs.
- **Écrire `&` devant un littéral** : impossible, passe par une variable ou une fonction aide.
- **Croire que `nil` vaut 0.**
- **Oublier que copier un pointeur partage la donnée** : modifier via l'un se voit via l'autre.

## À retenir

- Un pointeur est une variable qui contient l'adresse d'une autre ; son type s'écrit `*T`, sa valeur zéro est `nil`.
- `&x` donne l'adresse de `x`, `*p` donne la valeur pointée (et permet de l'écrire).
- Déréférencer `nil` fait paniquer.
- On crée un pointeur avec `&x`, `&T{…}` ou `new(T)` ; on ne peut pas prendre l'adresse d'un littéral.
- Pas d'arithmétique de pointeurs en Go.
