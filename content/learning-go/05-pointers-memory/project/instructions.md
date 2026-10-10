## Contexte

Relay exécute sans cesse les mêmes jobs avec les mêmes arguments. Un **cache LRU** (*Least Recently Used*) garde les résultats récents et, quand il est plein, oublie celui qu'on n'a pas touché depuis le plus longtemps. C'est la structure de données la plus utilisée de l'ingénierie système, et c'est un cas d'école de pointeurs : une **map** pour retrouver une entrée en temps constant, et une **liste doublement chaînée** pour retenir l'ordre de récence en temps constant aussi.

## L'idée de la structure

```
map : clé ─▶ ┌─────────┐
             │ maillon │    head ⇄ [plus récent] ⇄ … ⇄ [moins récent] ⇄ tail
             └─────────┘
```

Chaque maillon connaît son précédent et son suivant. Le **supprimer** (quand on le touche ou qu'on l'évince) et le **remettre en tête** ne coûte que quelques affectations de pointeurs. Deux maillons « sentinelles » (`head` et `tail`) qui ne contiennent aucune donnée évitent de traiter à part le premier et le dernier.

## Ta mission

Dans `cache.go`, tu définis les champs de `Cache` et implémentes les fonctions (toutes acceptent un cache `nil`, vu comme un cache vide) :

| Fonction | Rôle |
|---|---|
| `NewCache(capacity int) *Cache` | crée un cache ; la capacité est d'au moins une entrée |
| `Put(c, key, value)` | ajoute ou met à jour ; l'entrée devient la plus récente ; si le cache dépasse sa capacité, évince la moins récente |
| `Get(c, key) (string, bool)` | lit et rend l'entrée la plus récente |
| `Peek(c, key) (string, bool)` | lit **sans** changer la récence ni les statistiques |
| `Delete(c, key) bool` | supprime ; `false` si absente |
| `Len(c) int` | nombre d'entrées |
| `Keys(c) []string` | les clés de la plus récente à la moins récente |
| `Stats(c) (hits, misses, evictions int)` | succès et échecs de `Get`, évictions |

### Précisions

- Mettre à jour une clé existante (`Put`) ne change pas le nombre d'entrées, donc **n'évince rien** même si le cache est plein.
- Seul `Get` compte des succès et des échecs. `Peek` et `Delete` ne touchent pas aux statistiques ; une suppression n'est pas une éviction.
- Une valeur vide `""` est une valeur valide, et `""` est une clé valide.

## Jalons

1. **m1** : stockage, lecture, mise à jour, suppression, `Len`, sûreté face à `nil`. (Tu peux n'utiliser qu'une map.)
2. **m2** : la récence. Il te faut maintenant la liste doublement chaînée.
3. **m3** : `Peek`, `Stats`, et des opérations en temps constant (un test mesure 400 000 opérations).

## Contrainte

Pas de parcours de toutes les entrées dans `Put` ou `Get`.
