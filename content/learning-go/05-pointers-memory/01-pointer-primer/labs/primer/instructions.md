## Contexte

Tu écris le petit kit de pointeurs de Relay : un helper pour pointer vers un littéral, des échanges de valeurs, un champ optionnel. Chaque fonction exerce un aspect du modèle : adresse, déréférencement, `nil`.

## Ta mission

Dans `primer.go`, implémente six fonctions.

### `Ptr[T any](v T) *T`
Renvoie un pointeur vers une **copie** de `v`. C'est le helper `makePointer` du cours : il permet d'écrire `MiddleName: Ptr("Perry")`. Deux appels renvoient deux pointeurs **distincts**. *(La syntaxe `[T any]` est celle des fonctions génériques, qu'on étudiera plus tard : elle est déjà dans la signature, seul le corps t'intéresse.)*

### `Deref[T any](p *T, fallback T) T`
La valeur pointée par `p`, ou `fallback` si `p` est `nil`. Attention : un pointeur vers `0` ou `""` n'est **pas** absent.

### `Swap(a, b *int)`
Échange les valeurs pointées. Si l'un des pointeurs est `nil`, ne fait rien. `Swap(&c, &c)` ne change rien non plus.

### `IncrementAll(counters ...*int)`
Ajoute 1 à chaque entier pointé ; ignore les `nil`.

### `Largest(xs []int) *int`
Un pointeur vers le plus grand élément de `xs`, **dans la slice elle-même** : écrire à travers ce pointeur modifie `xs`. En cas d'égalité, la première case. `nil` si `xs` est vide.

### `FullName(p Person) string`
Prénom, deuxième prénom, nom, séparés par un espace. Le deuxième prénom est un `*string` optionnel : on l'ignore s'il est `nil`, vide ou fait uniquement d'espaces.

## Contrainte

Ne déréférence jamais un pointeur sans t'être assuré qu'il n'est pas `nil`.
