## Hint 1
Un record `@ConfigurationProperties("tixa.client")` avec des `@DefaultValue`, activé par `@EnableConfigurationProperties(TixaClientProperties.class)` sur l'autoconfiguration (un starter ne peut pas compter sur le scan de l'application).

## Hint 2
La méthode `@Bean` reçoit les propriétés et un `ObjectProvider<TixaClientCustomizer>` : zéro, un ou plusieurs customizers, sans erreur.

## Hint 3
`customizers.orderedStream()` donne les customizers triés par `@Order`. `@ConditionalOnMissingBean` sur la méthode : si l'application a son client, la méthode n'est jamais appelée, donc aucun customizer ne l'est.
