## Hint 1
Un parcours en profondeur : pour obtenir un bean, obtiens d'abord chacune de ses dépendances (appel récursif), puis fabrique-le, puis mets-le en cache. Le cache évite de recréer une dépendance partagée.

## Hint 2
Pour voir un cycle, il faut savoir quels beans sont **en cours** de création : ceux dont on est en train d'obtenir les dépendances. Si on retombe sur l'un d'eux, c'est une boucle. Un `LinkedHashSet` garde cet ensemble **et** l'ordre du chemin.

## Hint 3
Ajoute le nom à l'ensemble avant de résoudre les dépendances et retire-le dans un `finally`. Le chemin du cycle est la fin de l'ensemble, à partir de la première occurrence du nom retrouvé : `new ArrayList<>(inCreation).subList(index, size)`, puis ajoute le nom une dernière fois.
