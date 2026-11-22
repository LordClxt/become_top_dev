## Hint 1
Une condition de Spring implémente `Condition` ; Spring Boot fournit `SpringBootCondition`, dont la méthode `getMatchOutcome(context, metadata)` renvoie une `ConditionOutcome` (vraie ou fausse, avec un message) qui est enregistrée dans le rapport.

## Hint 2
`metadata.getAnnotationAttributes(ConditionalOnFeature.class.getName()).get("value")` donne le nom de la fonctionnalité sans réflexion. `context.getEnvironment().getProperty("tixa.features", "")` donne la liste.

## Hint 3
`ConditionMessage.forCondition(ConditionalOnFeature.class, feature).because("…")` construit un message au format du rapport ; `ConditionOutcome.match(message)` ou `ConditionOutcome.noMatch(message)`.
