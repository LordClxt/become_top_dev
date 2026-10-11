## Contexte

Un biologiste marin note chaque observation (date, famille, espèce, nombre d'animaux). Il veut le nombre de requins vus **par mois**. Tu écris le même calcul de deux façons : à la MapReduce, puis en pipeline `Match → GroupSum`, et tu vérifies qu'elles donnent le même résultat.

## À implémenter dans `mapreduce.go`

- **`MapReduce(docs, mapFn, reduceFn)`** (générique) : `mapFn` est appelée **une fois par document** et émet des paires via `emit(clé, valeur)` ; les valeurs sont regroupées par clé **dans l'ordre d'émission** ; `reduceFn` est appelée **une fois par clé**. Sans document, renvoie une map vide non nil.
- **`Match(docs, pred)`** : filtre en gardant l'ordre, sans modifier l'entrée.
- **`GroupSum(docs, key, val)`** : somme `val` par `key`.
- **`MonthlyTotalsMR(obs, family)`** : requins par mois (`"1995-12"`), via `MapReduce`. Dates lues en **UTC**.
- **`MonthlyTotalsPipeline(obs, family)`** : le même résultat via `Match` puis `GroupSum`.

## Rappel

`mapFn` et `reduceFn` doivent être **pures** : pas de variable globale, pas d'effet de bord.
