## Hint 1
Un analyseur d'échec n'est pas un bean : le contexte vient justement d'échouer. Spring Boot charge les implémentations de `org.springframework.boot.diagnostics.FailureAnalyzer` déclarées dans `META-INF/spring.factories`.

## Hint 2
`AbstractFailureAnalyzer<MissingSecretException>` fait le travail ingrat : il parcourt les causes et n'appelle ta méthode `analyze(Throwable rootFailure, MissingSecretException cause)` que s'il en trouve une du bon type.

## Hint 3
Renvoie `new FailureAnalysis(description, action, cause)`. Construis les deux textes avec `cause.property()` et `cause.envVariable()` ; n'y mets jamais la valeur d'un secret.
