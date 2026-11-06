## Hint 1
Le classement actuel soustrait deux scores : que vaut `Integer.MAX_VALUE - (-1)` ? Pour les versions, la comparaison de chaînes est alphabétique, caractère par caractère : `'1'` < `'9'`.

## Hint 2
`Version` : `Integer.compare` sur chaque partie, en s'arrêtant à la première différence (ou un `Comparator` statique construit avec `comparingInt(...).thenComparingInt(...)`). `RANKING` : `Comparator.comparingInt(Player::score).reversed()` puis `thenComparingLong` et `thenComparing`.

## Hint 3
Attention à `reversed()` : placé en fin de chaîne, il inverserait aussi l'heure et le nom. Inverse seulement le premier critère :
`comparingInt(Player::score).reversed().thenComparingLong(Player::finishedAtMillis).thenComparing(Player::name)`.
