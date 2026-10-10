## Hint 1
Les quatre messages de `go vet` pointent chacun une ligne. Ils parlent tous du lien entre la **chaîne de format** et les **valeurs** passées après.

## Hint 2
Vérifie pour chaque appel : autant de valeurs que de verbes `%` ; un verbe adapté au type (`%d` pour un entier, `%s` pour une string) ; une fonction qui comprend les verbes (`Sprint` et `Println` ne les interprètent pas, seules les fonctions en `f` le font).

## Hint 3
Il manque `pkg` dans `Summary` ; `Duration` doit utiliser `%d` ; `Status` doit appeler `Sprintf` ; dans `Percent`, un `%` littéral s'écrit `%%`.
