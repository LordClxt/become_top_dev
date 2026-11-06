## Contexte

La plateforme de tournois trie deux choses : les **versions** de son client (pour savoir qui doit se mettre à jour) et le **classement** des joueurs. Les deux tris sont faux.

## 1. `Version` implémente `Comparable<Version>`

`Version.parse("1.10.2")` : trois nombres, majeure, mineure, correctif ; les parties absentes valent 0 (`"2"` = `"2.0.0"`). `equals` et `hashCode` sont fournis.

Le `compareTo` actuel compare les chaînes : `1.10.0` passe avant `1.9.0`. Réécris-le pour un **ordre numérique** (majeure, puis mineure, puis correctif), **cohérent avec `equals`** : `parse("1.2")` et `parse("1.2.0")` sont égales et se comparent à 0.

## 2. `Leaderboard.RANKING`

Un `Comparator<Player>` qui ordonne le classement :

1. **score décroissant** ;
2. à score égal, celui qui a **fini le plus tôt** (`finishedAtMillis` croissant) ;
3. à égalité parfaite, **nom** par ordre alphabétique.

Les scores couvrent tout l'intervalle des `int` (bonus et pénalités extrêmes). `top(n)` renvoie les `n` premiers. Garde le comparateur dans le champ `static final` et compose-le avec les méthodes de `Comparator`.
