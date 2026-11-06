## Hint 1
Trois patrons du module : le **builder** (leçon 2) pour configurer le registre, une **fabrique à instances contrôlées** (leçon 1) pour `counter`/`timer`, l'**injection d'une fabrique** (leçon 3) pour l'horloge — un `LongSupplier`.

## Hint 2
Le registre garde une `Map<String, Object>` (ou deux maps et une vérification croisée) ; `computeIfAbsent` crée la métrique au premier appel et renvoie la même ensuite. L'expression régulière des noms se compile **une fois**, dans un champ `static final Pattern`. Pour la fenêtre, une `ArrayDeque<Duration>` : `addLast`, puis `removeFirst` tant que la taille dépasse le maximum.

## Hint 3
`Sample` est une classe imbriquée qui retient le tick de départ et un booléen `closed` ; `close()` sort tout de suite si `closed`, sinon calcule la durée avec le ticker du timer et appelle une méthode `record(Duration)` du timer. `recent()` renvoie `List.copyOf(window)`. `names()` : `Collections.unmodifiableSortedSet(new TreeSet<>(map.keySet()))`.
