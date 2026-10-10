## Contexte

Les closures sont les outils de base de la boîte à outils fonctionnelle de Go : elles fabriquent des fonctions configurées, retiennent un état, enchaînent des traitements. Tu implémentes cinq petites briques que tu retrouveras dans les middlewares et les pipelines de données.

## Ta mission

Dans `closures.go`, implémente :

### `Counter(start int) func() int`
Renvoie une fonction qui renvoie `start`, puis `start+1`, puis `start+2`… à chaque appel. Deux appels à `Counter` créent deux compteurs **indépendants**.

### `Prefixer(prefix string) func(string) string`
Renvoie une fonction qui ajoute `prefix` devant son argument.

### `Memoize(f func(int) int) func(int) int`
Renvoie une version de `f` qui **retient ses résultats** : `f` n'est appelée qu'une fois par argument. Chaque fonction mémoïsée a son propre cache. Attention : un résultat égal à `0` est un résultat comme un autre.

### `Chain(fns ...func(string) string) func(string) string`
Renvoie une fonction qui applique `fns` **dans l'ordre**. Sans fonction, c'est l'identité.

`Chain` doit rester correcte même si l'appelant modifie sa slice `fns` après coup. Rappelle-toi : avec `Chain(fns...)`, la fonction reçoit **la même slice** que l'appelant.

### `SortPeople(people []Person, less func(a, b Person) bool)`
Trie `people` **sur place** à l'aide de `less`, avec un tri **stable** : deux personnes « égales » gardent leur ordre d'origine. Tu peux t'appuyer sur `sort.SliceStable` : sa fonction reçoit des *indices*, la tienne des *éléments*. C'est à toi de faire le lien avec une closure.

## Contrainte

Aucune variable de package : tout l'état vit dans les closures.
