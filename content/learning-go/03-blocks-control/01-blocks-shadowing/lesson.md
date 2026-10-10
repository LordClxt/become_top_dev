---
id: go-ch03-l01
title: "Blocs et shadowing : qui voit quelle variable ?"
source: { chapter: 4, pages: "91-95" }
duration_min: 25
concepts:
  - id: go-blocks
    label: "Les blocs emboîtés : univers, package, fichier, fonction, accolades"
  - id: go-shadowing
    label: "Le shadowing : une variable qui masque celle du bloc englobant"
  - id: go-universe-block
    label: "Les identifiants prédéclarés (true, nil, len, int…) sont masquables"
glossary:
  - term: "bloc"
    definition: "Zone du code où des déclarations ont une portée limitée : le fichier, une fonction, tout ce qui est entre accolades."
  - term: "portée (scope)"
    definition: "Partie du code où un identifiant est visible. En Go, elle est lexicale : elle se lit dans le texte, pas à l'exécution."
  - term: "shadowing"
    definition: "Déclarer, dans un bloc interne, un identifiant du même nom qu'un identifiant d'un bloc englobant. Le nouveau masque l'ancien jusqu'à la fin du bloc."
  - term: "bloc univers"
    definition: "Bloc le plus extérieur, qui contient les identifiants prédéclarés : int, string, true, false, nil, len, make…"
visuals: [go-ch03-scope-shadowing]
labs: [go-ch03-l01-lab-scopes]
xp: 30
---

## Pourquoi c'est important

Sur le papier, la portée est simple : une variable existe là où elle est déclarée. En pratique, une écriture trop rapide de `:=` crée une **nouvelle** variable à la place de modifier l'ancienne, le code compile, et la valeur que tu croyais mettre à jour reste inchangée. Ce genre de bug passe en revue de code parce que chaque ligne, prise seule, semble correcte. Il faut donc savoir *voir* les blocs.

## Les blocs

Un **bloc** est une zone du code où les déclarations ont une portée propre. Go en emboîte plusieurs, du plus large au plus étroit :

| Bloc | Ce qu'il contient |
|---|---|
| **Univers** | Les identifiants prédéclarés : `int`, `string`, `true`, `false`, `nil`, `len`, `make`… |
| **Package** | Tout ce qui est déclaré hors d'une fonction (variables, constantes, types, fonctions) |
| **Fichier** | Les noms des packages importés, valables pour ce fichier seulement |
| **Fonction** | Les paramètres et les variables de plus haut niveau de la fonction |
| **Accolades** `{}` | Chaque paire d'accolades ouvre un nouveau bloc : `if`, `for`, `switch`, `case`, ou un simple `{ … }` |

Règle de lecture : depuis un bloc, tu vois **tous les identifiants des blocs qui l'englobent**. L'inverse est faux : ce qui est déclaré dans un bloc disparaît à son accolade fermante.

```go
func main() {
	limit := 3            // bloc de la fonction
	for i := 0; i < limit; i++ {
		double := i * 2   // bloc de la boucle : invisible en dehors
		fmt.Println(double)
	}
	fmt.Println(double)   // erreur : undefined: double
}
```

## Le shadowing

Si tu déclares dans un bloc interne un nom qui existe déjà dans un bloc englobant, la nouvelle variable **masque** l'ancienne, tant que le bloc interne dure :

```go
x := 10
if x > 5 {
	fmt.Println(x) // 10 : on voit encore le x extérieur
	x := 5         // nouvelle variable, qui masque l'autre
	fmt.Println(x) // 5
}
fmt.Println(x)     // 10 : le x extérieur n'a jamais changé
```

L'ancienne variable n'a pas disparu ni changé : on ne peut simplement plus l'atteindre pendant que la nouvelle existe. Neuf fois sur dix, dans ce code, on voulait écrire `x = 5` (une **affectation**) et pas `x := 5` (une **déclaration**).

::visual{id="go-ch03-scope-shadowing"}

### Le piège de `:=` avec plusieurs variables

`:=` accepte des variables déjà existantes, **mais seulement celles du bloc courant** :

```go
x := 10
if x > 5 {
	x, y := 5, 20  // x et y sont TOUTES LES DEUX nouvelles ici
	fmt.Println(x, y)
}
fmt.Println(x)     // 10
```

Le `x` extérieur appartient à un autre bloc : `:=` le masque au lieu de le réutiliser. Quand tu veux réutiliser une variable extérieure avec une nouvelle, déclare la nouvelle avec `var`, puis affecte avec `=`.

### Masquer un package

Les packages importés vivent dans le bloc du fichier : une variable locale peut les masquer.

```go
fmt := "oops"
fmt.Println(fmt) // erreur : fmt.Println undefined (type string has no field or method Println)
```

Le message est trompeur : le problème n'est pas que `fmt` soit un mauvais nom de variable, c'est qu'il a masqué le package pour le reste de la fonction.

## Le bloc univers

`true`, `nil`, `int`, `len` ne sont **pas des mots-clés** : ce sont des identifiants prédéclarés, définis dans le bloc univers. Donc ils se masquent comme n'importe quoi :

```go
fmt.Println(true) // true
true := 10
fmt.Println(true) // 10
```

C'est légal et dangereux. Si tu écris `len := len(items)` puis plus bas `len(other)`, la deuxième ligne ne compile plus. Si tu masques `nil` ou `true`, tu obtiens des comportements qui défient la logique. **Ne redéfinis jamais un identifiant de l'univers.** `string`, `error`, `max`, `min` sont des noms tentants pour des variables : choisis-en d'autres (`text`, `failure`, `highest`).

> **Au-delà du livre.** `go vet` ne signale pas le shadowing, parce qu'il est parfois voulu. Des analyseurs plus stricts le font : l'analyseur `shadow` de `golang.org/x/tools`, ou `govet` configuré avec `enable: [shadow]` dans golangci-lint. Dans une grosse base de code, c'est un filet de sécurité utile pour le cas classique de `err`.

## Pièges fréquents

- **`err` masqué.** `if err := f(); err != nil { … }` est correct. Mais `result, err := g()` à l'intérieur d'un bloc, alors qu'une `err` existe dehors, crée une nouvelle `err` que personne ne retournera.
- **`:=` à la place de `=`** dans un `if` ou une boucle, pour mettre à jour un compteur ou un résultat déclaré avant.
- **Variable nommée comme un package** (`url`, `path`, `errors`) qui masque l'import dans la suite de la fonction.
- **Masquer un identifiant de l'univers** (`len`, `string`, `true`, `nil`).

## À retenir

- Les blocs s'emboîtent : univers → package → fichier → fonction → accolades. On voit vers l'extérieur, jamais vers l'intérieur.
- `x := …` dans un bloc interne **crée** une nouvelle variable qui masque celle de l'extérieur ; `x = …` **modifie** l'existante.
- `:=` ne réutilise que les variables du bloc courant.
- Les identifiants de l'univers (`true`, `nil`, `len`…) ne sont pas des mots-clés : ne les masque jamais.
