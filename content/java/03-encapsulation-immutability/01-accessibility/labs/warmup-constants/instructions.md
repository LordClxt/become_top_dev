## Contexte

`Currencies.CODES` liste les devises acceptées par le paiement. Il est `public static final`… et un module de test a écrit `Currencies.CODES[0] = "XXX"` : depuis, l'euro est refusé dans toute la JVM. `final` protège la **référence**, pas le contenu du tableau.

## Ta mission

Dans `Currencies.java` :

1. Rends le tableau **privé**.
2. Expose `public static final List<String> CODES`, une liste **non modifiable** des mêmes codes, dans le même ordre.
3. Ajoute `public static String[] codesArray()` pour les clients qui veulent un vrai tableau : chacun reçoit **sa propre copie**.

`isAccepted(String)` doit continuer à fonctionner.
