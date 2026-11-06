## Hint 1
Jalon 1 : le parseur découpe avec `line.strip().split("\\s+")` et choisit avec un `switch` sur le premier mot en minuscules (`toLowerCase(Locale.ROOT)`). Le prix : vérifie `\d+(\.\d{1,2})?`, puis sépare la partie entière et les décimales (complétées à deux chiffres) et calcule `entier * 100 + décimales` avec `Math.multiplyExact`/`addExact`.

## Hint 2
Jalon 2 : une `LinkedHashMap<Long, Place>` des ordres vivants (l'ordre d'arrivée sert au matching des modules suivants). `handle` est un `switch (command)` sur l'interface scellée, sans `default`. Pour le carnet : filtre par symbole et par côté, `Collectors.groupingBy(Place::limitCents, TreeMap::new, Collectors.summingLong(Place::qty))`, puis transforme en `List<Level>` dans le bon ordre (`descendingMap()` pour les achats).

## Hint 3
Jalon 3 : `script.split("\n", -1)` garde les numéros de ligne ; un `try/catch (IllegalArgumentException e)` autour de `CommandParser.parse` produit `ligne N : …`. Rends chaque réponse avec un `switch` exhaustif sur `Reply` et des motifs de records (`case Accepted(long id) -> "ordre " + id + " accepté"`). Pour les ventes du plus cher au moins cher, `asks.reversed()`.
