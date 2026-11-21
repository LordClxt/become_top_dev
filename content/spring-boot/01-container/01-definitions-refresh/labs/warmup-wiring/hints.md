## Hint 1
Une méthode annotée `@Bean` dans une classe `@Configuration` est une recette : le conteneur l'appelle une fois et garde l'objet renvoyé. Le nom du bean est, par défaut, le nom de la méthode.

## Hint 2
Pour brancher `ReservationService` sur les autres beans, déclare-les comme **paramètres** de sa méthode `@Bean` : le conteneur les cherche par type et te les passe.

## Hint 3
Trois méthodes : `eventCatalog()` renvoie `new EventCatalog()`, `priceCalculator()` renvoie `new PriceCalculator(150)`, et `reservationService(EventCatalog catalog, PriceCalculator prices)` renvoie `new ReservationService(catalog, prices)`.
