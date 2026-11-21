## Hint 1
Un `EnvironmentPostProcessor` n'est pas un bean : il tourne avant que le contexte existe. Spring Boot le trouve dans `META-INF/spring.factories`, sous la clé du nom complet de l'interface.

## Hint 2
`postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application)` : lis la région avec `environment.getProperty("tixa.region", "eu")`, puis ajoute une `MapPropertySource`. Les sources sont ordonnées : `getPropertySources().addLast(...)` la met en bas de la liste, sous les fichiers de configuration déjà chargés.

## Hint 3
`spring.factories` : une ligne `org.springframework.boot.EnvironmentPostProcessor=app.RegionDefaults`. Ton post-processor passe après celui qui lit les fichiers de configuration (`ConfigDataEnvironmentPostProcessor`, très prioritaire) : `tixa.region` y est donc déjà disponible.
