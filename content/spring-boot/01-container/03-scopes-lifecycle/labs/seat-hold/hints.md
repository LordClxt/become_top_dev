## Hint 1
Un singleton reçoit ses dépendances **une seule fois**, à sa création. Même si `SeatHold` devient prototype, l'injecter directement dans le constructeur de `HoldDesk` donne toujours la même instance. Il faut injecter un moyen d'en **redemander** une.

## Hint 2
`ObjectProvider<SeatHold>` : chaque `getObject()` repasse par le conteneur, donc crée un nouveau prototype. Pour l'arrêt : le conteneur ne garde aucune trace des prototypes qu'il a créés, il n'appelle donc jamais leur `@PreDestroy`. C'est le singleton qui doit les suivre.

## Hint 3
`@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)` sur `seatHold()`. `HoldDesk` garde une `List<SeatHold>` des réservations ouvertes (méthodes `synchronized`), et une méthode `@PreDestroy` qui appelle `release()` sur chacune puis écrit `open.size() + " réservations libérées"` dans le journal.
