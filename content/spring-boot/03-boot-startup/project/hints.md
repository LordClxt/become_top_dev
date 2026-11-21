## Hint 1
M1 : un record `@ConfigurationProperties("tixa")` + `@Validated`, des `@DefaultValue`, et `@ConfigurationPropertiesScan` sur `TixaApp`. M2 : `@Profile("!prod")` et `@Profile("prod")` sur deux méthodes `@Bean` ; la méthode de la vraie banque reçoit `TixaProperties`.

## Hint 2
M2 : le groupe se déclare avec `spring.profiles.group.staging: prod`, et les frais de production dans un document YAML `spring.config.activate.on-profile: prod`. M3 : un `ApplicationRunner` tourne après le démarrage du contexte et avant `ApplicationReadyEvent` ; une exception levée dans `run` fait échouer le démarrage.

## Hint 3
M3 : une méthode `@EventListener(ApplicationReadyEvent.class)` dans le même bean ; `Environment.getActiveProfiles()` donne les profils actifs (tableau vide = « default »).
