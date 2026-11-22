## Hint 1
Une autoconfiguration n'est jamais trouvée par `@ComponentScan` : Spring Boot lit, dans **tous** les jars, les fichiers `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`, qui listent une classe par ligne.

## Hint 2
`@AutoConfiguration` sur la classe (c'est une `@Configuration(proxyBeanMethods = false)` qui se range dans la phase des autoconfigurations). Une méthode `@Bean` avec `@ConditionalOnMissingBean` cède la place au bean de l'application.

## Hint 3
`@Value("${tixa.client.base-url:https://api.tixa.example}")` en paramètre de la méthode `@Bean` donne l'URL avec sa valeur par défaut. Le fichier `imports` contient une seule ligne : `tixa.client.TixaClientAutoConfiguration`.
