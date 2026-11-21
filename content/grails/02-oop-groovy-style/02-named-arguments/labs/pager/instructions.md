## Contexte

Minigrails a besoin de l'équivalent de `Book.list(max: 10, offset: 20, sort: 'title', order: 'desc')`, mais sur une liste en mémoire. Les options viennent souvent **telles quelles** de la requête HTTP : ce sont alors des chaînes (`'20'`, `'abc'`, `'DESC'`). Fichier à éditer : `Pager.groovy`.

## `Pager.page(Map opts = [:], List items)`

Renvoie une Map `[items: …, total: …, max: …, offset: …]`, où `items` est la page demandée et `total` le nombre total d'éléments.

| Option | Valeur par défaut | Règle |
|---|---|---|
| `max` | 10 | entier entre 1 et 100 ; au-delà de 100 → 100 ; en dessous de 1 → 1 ; non convertible → 10 |
| `offset` | 0 | entier ≥ 0 ; négatif → 0 ; non convertible → 0 |
| `sort` | aucun tri | nom d'une propriété des éléments (objets ou Maps) |
| `order` | `asc` | `asc` ou `desc`, sans tenir compte de la casse ; autre valeur → `asc` |

Les valeurs peuvent être des nombres **ou** des chaînes (`max: '25'`).

```groovy
Pager.page(max: '2', offset: 1, sort: 'title', order: 'DESC', books)
// [items: [<2e et 3e livres par titre décroissant>], total: 5, max: 2, offset: 1]
```

## Refus explicites

- Une **clé inconnue** (`mx: 5`) lève `IllegalArgumentException`, avec un message qui cite la clé fautive **et** les clés admises.
- Un **`sort` sur une propriété qui n'existe pas** sur les éléments lève `IllegalArgumentException` : on ne trie pas sur n'importe quoi venu d'une URL.

## Contraintes

- Ne modifie jamais la Map reçue : c'est celle de l'appelant.
- `Pager.DEFAULTS` (fourni) doit pouvoir servir de base : `Pager.page(*:Pager.DEFAULTS, max: 5, items)`.
