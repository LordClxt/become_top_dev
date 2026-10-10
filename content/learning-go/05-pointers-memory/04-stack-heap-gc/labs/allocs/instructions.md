## Contexte

Dans le chemin le plus chaud de Relay (le formatage de chaque ligne de journal), chaque allocation sur le tas est du travail de plus pour le ramasse-miettes. Tu réécris trois fonctions pour qu'elles n'allouent **rien** : les tests mesurent le nombre d'allocations avec `testing.AllocsPerRun`.

## Ta mission

Dans `allocs.go`, implémente :

### `JoinInts(dst []byte, nums []int, sep byte) []byte`
Ajoute à `dst` les entiers de `nums` en décimal, séparés par `sep`, et renvoie le résultat (comme `append`). Avec un `dst` de capacité suffisante, **0 allocation**.

```
JoinInts([]byte("ids="), []int{4, 5}, ',') → "ids=4,5"
```

*(Le paquet `strconv` a une fonction qui écrit un entier directement à la suite d'une slice d'octets.)*

### `CountVowels(s string) int`
Compte les voyelles : `a e i o u y`, en majuscules ou minuscules, et leurs formes accentuées (`é è ê ë à â ä î ï ô ö ù û ü ÿ`, majuscules comprises). **0 allocation.**

Piège : `strings.ToLower(s)`, `[]rune(s)` ou `strings.Split` allouent. Parcours la string directement.

### `Dedupe(xs []int) []int`
Supprime **en place** les doublons *consécutifs* de `xs` et renvoie la slice raccourcie, qui réutilise **le même tableau** (même première case). Sur une slice triée, tous les doublons disparaissent. **0 allocation.**

## Contraintes

- Aucune allocation : pas de `make`, pas de conversion `[]rune`, pas de `strings.ToLower`.
- Ne modifie jamais le contenu d'une `nums` ou d'une `s` reçues (seule `xs` est modifiée par `Dedupe`).
