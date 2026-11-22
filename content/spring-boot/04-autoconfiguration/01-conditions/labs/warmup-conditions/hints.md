## Hint 1
Spring Boot fournit des conditions toutes prêtes : `@ConditionalOnClass` (une classe est sur le classpath), `@ConditionalOnMissingBean` (aucun bean de ce type n'existe encore), `@ConditionalOnBooleanProperty` (une propriété vaut true).

## Hint 2
`@ConditionalOnClass(name = "sdk.lydia.LydiaSdk")` avec le nom en texte : une référence `LydiaSdk.class` ne pourrait même pas être lue si la classe manque. Pose-la sur une classe `@Configuration` imbriquée qui contient la méthode `lydiaGateway`.

## Hint 3
`@ConditionalOnMissingBean(PaymentGateway.class)` sur `fakeGateway` : la configuration de l'application et la passerelle Lydia sont enregistrées avant. `@ConditionalOnBooleanProperty("tixa.audit.enabled")` vaut faux si la propriété est absente.
