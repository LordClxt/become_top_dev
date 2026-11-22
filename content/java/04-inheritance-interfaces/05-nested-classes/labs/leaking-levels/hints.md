## Hint 1
Qu'est-ce qui relie un `Level` à son carnet ? Une classe membre **non statique** (et une classe anonyme créée dans une méthode d'instance) garde une référence cachée vers l'objet englobant dès qu'elle lit l'un de ses champs. Lesquels sont lus ici ?

## Hint 2
`Level` lit `currency` ; le comparateur anonyme lit `descending`. Rends `Level` statique et donne-lui sa devise par le constructeur. Pour le comparateur, il ne doit rien capturer du carnet.

## Hint 3
`public static final class Level` avec un champ `currency` ; deux comparateurs `private static final` (`Comparator.comparingLong(Level::priceCents)` et sa version `reversed()`), et `byPrice()` renvoie l'un ou l'autre selon `descending`.
