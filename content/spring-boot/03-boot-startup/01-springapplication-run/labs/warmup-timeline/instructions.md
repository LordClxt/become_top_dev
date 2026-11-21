## Contexte

Tixa doit préchauffer son catalogue au démarrage, et l'exploitation veut voir, dans l'ordre, ce qui se passe entre `main()` et le moment où l'application accepte du trafic. Spring Boot publie un événement à chaque étape : il suffit de savoir les écouter, et **à partir de quand** on peut le faire.

Fournis : `TixaApp` (`@SpringBootApplication`), `Timeline` (un écouteur qui note les événements) et `LateListener`. Tu écris `Launcher.java` et `CatalogWarmUp.java`.

## Ta tâche

1. `Launcher.create(timeline)` renvoie une `SpringApplication` pour `TixaApp` :
   - sans bannière, et **sans serveur web** (`WebApplicationType.NONE`) ;
   - qui transmet **tous** les événements du démarrage à `timeline`, y compris le tout premier ;
   - dont le contexte contient `timeline` comme bean, pour que d'autres beans puissent y écrire.
2. `CatalogWarmUp` est un bean qui note `catalogue préchauffé` dans la timeline **une fois le contexte démarré, mais avant** que l'application soit déclarée prête.

## Résultat attendu

```
ApplicationStartingEvent, ApplicationEnvironmentPreparedEvent, ApplicationContextInitializedEvent,
ApplicationPreparedEvent, ContextRefreshedEvent, ApplicationStartedEvent,
catalogue préchauffé, ApplicationReadyEvent
```

## À observer

`LateListener` est un `@Component` qui écoute `ApplicationStartingEvent`. Combien en reçoit-il ?
