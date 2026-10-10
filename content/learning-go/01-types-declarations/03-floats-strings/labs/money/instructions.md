## Contexte

Tu travailles sur la caisse d'une application de partage de frais. Un premier prototype stockait les montants en `float64`, et les totaux affichaient des `0.30000000000000004`. On repart sur de bonnes bases : **des centimes entiers**.

## Ta mission

Dans `money.go`, implémente quatre fonctions.

### `Approx(a, b, epsilon float64) bool`
Vrai si `a` et `b` sont égaux à `epsilon` près. Elle doit gérer les valeurs spéciales : `+Inf` est égal à `+Inf`, mais un infini n'est proche d'aucun nombre fini, et `NaN` n'est égal à rien.

### `ParseCents(s string) (int64, error)`
Lit un montant comme `"12.34"`, `"12"`, `"0.5"` ou `"-1.25"` et renvoie des centimes. Règles :

- au plus **deux** chiffres après le point, et au moins un s'il y a un point (`"1."` et `"1.234"` sont refusés) ;
- pas de partie entière vide (`".5"` refusé), pas de `+`, pas d'espaces, pas de virgule ;
- `"0.5"` vaut `50` centimes (un chiffre après le point = des dizaines de centimes) ;
- un montant qui dépasse `int64` est une erreur ;
- **aucun flottant** dans ton implémentation : c'est tout le sujet.

### `FormatCents(cents int64) string`
L'opération inverse : `1234 → "12.34"`, `5 → "0.05"`, `-5 → "-0.05"`. Elle doit marcher pour toutes les valeurs d'`int64`.

### `SplitBill(total int64, n int) []int64`
Répartit `total` centimes entre `n` personnes **sans perdre un centime**. Quand la division ne tombe pas juste, les premières personnes paient un centime de plus : `SplitBill(1000, 3)` donne `[334 333 333]`. Renvoie `nil` si `n <= 0` ou si `total < 0`.
