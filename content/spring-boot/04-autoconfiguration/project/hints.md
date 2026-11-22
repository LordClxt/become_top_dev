## Hint 1
M1 : `@AutoConfiguration` + `@EnableConfigurationProperties(PaymentProperties.class)` ; sur la méthode `@Bean`, `@ConditionalOnMissingBean` et `@ConditionalOnProperty("tixa.payment.api-key")` (vrai si la propriété existe et ne vaut pas `false`). N'oublie pas le fichier `imports`, une classe par ligne.

## Hint 2
M2 : un paramètre `ObjectProvider<PaymentClientCustomizer>` et `orderedStream()`. M3 : `@AutoConfiguration(after = PaymentAutoConfiguration.class)` et `@ConditionalOnClass(MeterSink.class)` au niveau de la classe.

## Hint 3
M3 : `@ConditionalOnBean(PaymentClient.class)` sur la méthode qui crée `PaymentMetrics`, et `@ConditionalOnMissingBean` sur celle du `MeterSink`. Déclare les deux autoconfigurations dans le fichier `imports`.
