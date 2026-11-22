## Hint 1
Les classes Jackson 3 : `tools.jackson.databind.json.JsonMapper`, `tools.jackson.databind.PropertyNamingStrategies`. Spring Boot 4 déclare un bean `JsonMapper` (le mapper JSON de Jackson 3), configuré par son autoconfiguration.

## Hint 2
Boot 4 a découpé son autoconfiguration en modules : celle de Jackson vit dans `spring-boot-jackson`, paquet `org.springframework.boot.jackson.autoconfigure`. Son customizer s'appelle `JsonMapperBuilderCustomizer` et reçoit un `JsonMapper.Builder`.

## Hint 3
Dans Jackson 3, `JacksonException` est une `RuntimeException` : `writeValueAsString` ne déclare plus d'exception vérifiée, le `try/catch` disparaît.
