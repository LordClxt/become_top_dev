## Hint 1
M1 : des fabriques `ofMinor`, `parse`, `zero` autour d'un constructeur privé ; un cache des zéros par devise (une `EnumMap` remplie une fois, ou un tableau indexé par `ordinal()`). M2 : le builder de la leçon 2. M3 : la leçon 5 (try-with-resources, exceptions supprimées) et la leçon 4 (références obsolètes).

## Hint 2
M1 : fais passer **toutes** les créations par une seule méthode privée qui renvoie le zéro en cache quand le montant vaut 0. Pour `parse`, une expression régulière compilée une fois (`-?\d+(\.\d+)?`), puis vérifie le nombre de décimales et complète à droite avec des zéros. `Math.addExact` détecte le dépassement.
M3 : garde les lignes dans une `List<String>` ; écris `List.copyOf(buffer)` puis `buffer.clear()` **seulement si** l'écriture a réussi.

## Hint 3
M1 : `toString` découpe `Math.abs(minor)` en partie entière `/ 10^digits` et décimales `% 10^digits` (complétées à gauche par des zéros), préfixées par `-` si négatif.
M2 : la vérification « marché + allOrNone » se fait dans le constructeur privé d'`Order`, sur les valeurs copiées du builder.
M3 : `close()` peut s'écrire `if (closed) return; closed = true; try (sink) { flush(); }` — le langage ferme le support et attache l'erreur de fermeture à celle du vidage.
