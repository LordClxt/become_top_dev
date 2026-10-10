---
id: go-ch03-l03
title: "for-range : slices, maps et strings"
source: { chapter: 4, pages: "102-108" }
duration_min: 25
concepts:
  - id: go-for-range
    label: "for-range sur slices, arrays, maps et strings"
  - id: go-range-string
    label: "Parcourir une string donne des runes et des décalages en octets"
  - id: go-range-copy
    label: "La valeur du range est une copie"
  - id: go-map-order
    label: "L'ordre de parcours d'une map est aléatoire"
glossary:
  - term: "for-range"
    definition: "Boucle qui parcourt une collection et fournit à chaque tour la position (ou la clé) et la valeur."
  - term: "décalage (offset)"
    definition: "Position en octets depuis le début d'une string. Pour une string, l'indice d'un range est un offset, pas un numéro de caractère."
  - term: "caractère de remplacement"
    definition: "U+FFFD (�), renvoyé par un range quand il rencontre des octets qui ne forment pas de l'UTF-8 valide."
  - term: "Hash DoS"
    definition: "Attaque qui envoie des clés conçues pour toutes tomber dans le même emplacement d'une table de hachage et la ralentir. L'ordre aléatoire des maps de Go en fait partie des protections."
visuals: [go-ch03-range-string]
labs: [go-ch03-l03-lab-ranges]
xp: 30
---

## Pourquoi c'est important

La grande majorité des boucles que tu écriras en Go sont des `for-range`. Elles évitent les erreurs d'indice, gèrent les strings Unicode correctement et s'écrivent en une ligne. Mais chaque collection a ses particularités, et trois d'entre elles piègent presque tout le monde : l'ordre des maps, la copie de la valeur et le sens de l'indice dans une string.

## Le principe

```go
evenVals := []int{2, 4, 6, 8}
for i, v := range evenVals {
	fmt.Println(i, v)   // 0 2, puis 1 4, 2 6, 3 8
}
```

À chaque tour, `range` fournit **deux** variables : la position (ou la clé) puis la valeur. Les noms usuels dépendent de ce qu'on parcourt : `i` et `v` pour un array, une slice ou une string ; `k` et `v` pour une map. Un nom plus parlant est bienvenu dans une boucle longue ou imbriquée.

Comme toute variable déclarée, elles doivent être **lues**. Pour ignorer l'une, utilise `_` :

```go
for _, v := range evenVals { … }     // seulement les valeurs
for k := range uniqueNames { … }     // seulement les clés : on supprime le second nom
```

Parcourir seulement les clés est typique d'une **map utilisée comme ensemble**. Sur une slice, c'est rare : si tu ne veux que les positions, demande-toi si la structure de données est la bonne.

## Parcourir une map : l'ordre est aléatoire

```go
m := map[string]int{"a": 1, "c": 3, "b": 2}
for i := 0; i < 3; i++ {
	for k, v := range m {
		fmt.Print(k, "=", v, " ")
	}
	fmt.Println()
}
// a=1 c=3 b=2
// c=3 b=2 a=1
// b=2 a=1 c=3     ← l'ordre change d'une boucle à l'autre
```

C'est voulu. Avant, l'ordre dépendait de ce qu'on avait inséré, et deux problèmes sont apparus : des programmes qui supposaient cet ordre cassaient de façon imprévisible, et un attaquant pouvait fabriquer des clés qui entrent toutes en collision pour ralentir un serveur (Hash DoS). Go randomise donc le hachage et le point de départ du parcours.

**Conséquence :** si l'ordre compte (affichage, test, résultat stable), trie les clés avant d'itérer. Une exception pratique : `fmt` affiche toujours les maps avec leurs clés **triées**, pour faciliter le débogage.

```go
keys := slices.Sorted(maps.Keys(m))   // Go 1.23+
for _, k := range keys {
	fmt.Println(k, m[k])
}
```

## Parcourir une string : des runes, pas des octets

```go
for i, r := range "apple_π!" {
	fmt.Println(i, r, string(r))
}
// 0 97 a   1 112 p   2 112 p   3 108 l   4 101 e   5 95 _   6 960 π   8 33 !
```

Regarde les deux anomalies : l'indice **saute de 6 à 8**, et la valeur en 6 est 960. C'est que `range` sur une string décode l'UTF-8 : à chaque tour, `r` est une **rune** (un point de code, 32 bits) et `i` est le **décalage en octets** de cette rune dans la string. `π` occupe deux octets (6 et 7), donc la rune suivante commence à 8.

::visual{id="go-ch03-range-string"}

Si le range rencontre des octets qui ne forment pas de l'UTF-8 valide, il renvoie le caractère de remplacement `U+FFFD` et avance d'un octet.

> **À retenir pour les strings.** `range` est la seule façon naturelle de parcourir les *caractères*. Une boucle `for i := 0; i < len(s); i++` parcourt les **octets** et coupe un `é` ou un emoji en deux.

## La valeur est une copie

`v` est une **copie** de l'élément. La modifier ne change pas la collection :

```go
evenVals := []int{2, 4, 6}
for _, v := range evenVals {
	v *= 2          // ne modifie que la copie
}
fmt.Println(evenVals)   // [2 4 6]

for i := range evenVals {
	evenVals[i] *= 2    // modifie vraiment l'élément
}
fmt.Println(evenVals)   // [4 8 12]
```

Pour modifier en place, passe par l'indice.

### Une variable neuve à chaque tour (Go 1.22)

Avant Go 1.22, les variables de boucle (`i`, `v`) étaient créées **une seule fois** et réutilisées. Si tu en capturais une dans une closure ou une goroutine, toutes voyaient la dernière valeur : un bug classique.

Depuis Go 1.22, **chaque tour reçoit sa propre variable**. Ce changement n'est actif que si le `go.mod` annonce `go 1.22` ou plus (pour ne pas casser les anciens modules), ce qui est le cas de tous les projets neufs.

```go
var fs []func() int
for i := 0; i < 3; i++ {
	fs = append(fs, func() int { return i })
}
// Go 1.22+ : 0, 1, 2     ·     avant : 3, 3, 3
```

## Choisir la bonne forme de `for`

- **`for-range`** par défaut dès que tu parcours *tout* le contenu d'une slice, d'un array, d'une map ou d'une string.
- **`for` complet** quand tu ne parcours pas du début à la fin : un sous-intervalle, un pas différent de 1. C'est plus court et plus clair que `range` avec `continue` et `break`.

```go
// du 2e à l'avant-dernier élément
for i := 1; i < len(xs)-1; i++ { fmt.Println(i, xs[i]) }
```

Exception : **n'utilise jamais** un `for` à indice pour sauter le début d'une string, il ne gère pas les runes multioctets.

- **Condition seule** pour boucler sur une valeur calculée.
- **Infinie** pour les lectures jusqu'à une sentinelle ou un `do-while`, avec une sortie garantie.

## Pièges fréquents

- **Supposer un ordre pour une map.** Trie les clés, ou utilise une slice.
- **Modifier `v` en croyant modifier la collection.** Passe par l'indice.
- **Confondre l'indice d'une string avec le numéro du caractère.** C'est un décalage en octets.
- **Capturer la variable de boucle** dans une closure ou une goroutine sur un module d'avant Go 1.22.
- **Utiliser `len(s)` comme nombre de caractères.** C'est un nombre d'octets.

## À retenir

- `for i, v := range x` fournit position et valeur ; `_` ignore ce dont tu n'as pas besoin.
- Les maps se parcourent dans un ordre aléatoire ; `fmt` les affiche triées.
- Sur une string, `range` donne des **runes** et des **décalages en octets**.
- `v` est une copie : modifie `x[i]` pour changer la collection.
- Depuis Go 1.22, chaque tour de boucle a ses propres variables.
