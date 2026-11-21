## Hint 1
Compte les objets `ReservationStore` qui existent vraiment pendant un test. Pour le savoir, compare l'instance que reçoit le service, celle que reçoit le tableau de bord et celle que renvoie `ctx.getBean(ReservationStore.class)`. Puis regarde **quand** le tableau de bord lit ses chiffres.

## Hint 2
Une méthode `@Bean` appelée depuis une autre méthode `@Bean` n'est interceptée par le conteneur que si la classe est une vraie `@Configuration` (sous-classée par CGLIB). Dans une classe `@Component`, c'est un simple appel Java : `new ReservationStore()` à chaque fois. Ensuite, `@PostConstruct` ne tourne qu'**une fois**, au démarrage.

## Hint 3
Dans `StoreConfig` : `@Configuration` à la place de `@Component`, et surtout les dépendances en **paramètres** des méthodes `@Bean` (`reservationService(ReservationStore store)`) plutôt qu'en appels de méthodes. Dans `Dashboard` : supprime le chargement dans `@PostConstruct` et lis `store.snapshot()` à chaque appel de `soldSeats`.
