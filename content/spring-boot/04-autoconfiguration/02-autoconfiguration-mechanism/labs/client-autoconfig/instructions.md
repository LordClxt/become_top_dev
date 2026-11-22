## Contexte

L'équipe plateforme publie le client de l'API Tixa (`tixa.client.TixaClient`) sous forme de bibliothèque. Les applications qui l'ajoutent doivent recevoir un `TixaClient` prêt à l'emploi **sans rien déclarer**, comme on reçoit un `DataSource` en ajoutant un pilote JDBC. Elles doivent aussi pouvoir le remplacer, le configurer, ou le désactiver.

Fournis : `app.TixaApp` (une application qui n'importe rien du client) et `TixaClient`. Le paquet `tixa.client` n'est **pas** scanné par l'application. Tu écris `TixaClientAutoConfiguration.java` et le fichier `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.

## Ta tâche

1. `TixaClientAutoConfiguration` est une autoconfiguration qui fournit un `TixaClient` :
   - URL de base : `tixa.client.base-url`, par défaut `https://api.tixa.example` ;
   - aucun client si l'application en déclare déjà un.
2. Spring Boot doit la trouver tout seul : déclare-la dans le fichier `imports`.

Elle peut alors être exclue comme n'importe quelle autoconfiguration de Spring Boot (`spring.autoconfigure.exclude`).
