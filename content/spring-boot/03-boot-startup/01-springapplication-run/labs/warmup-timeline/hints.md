## Hint 1
Un écouteur déclaré comme bean n'existe qu'une fois le contexte créé, bien après les premiers événements. Pour tout voir, l'écouteur doit être donné à la `SpringApplication` elle-même.

## Hint 2
`app.addListeners(...)` pour les événements. Pour faire de `timeline` un bean, un `ApplicationContextInitializer` (`app.addInitializers(ctx -> ...)`) reçoit le contexte juste avant le chargement des beans : `ctx.getBeanFactory().registerSingleton("timeline", timeline)`.

## Hint 3
Un `ApplicationRunner` (une méthode `run(ApplicationArguments)`) est appelé par Spring Boot après `ApplicationStartedEvent` et avant `ApplicationReadyEvent`. Annote `CatalogWarmUp` `@Component`, reçois `Timeline` par le constructeur.
