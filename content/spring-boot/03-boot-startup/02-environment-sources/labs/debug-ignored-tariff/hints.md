## Hint 1
Affiche d'où vient la valeur : dans un test, `ctx.getEnvironment().getPropertySources()` liste les sources dans l'ordre de priorité, et tu peux demander `ps.getProperty("tixa.fee-cents")` à chacune. Regarde aussi quels fichiers existent dans le dossier de travail, pas seulement dans le classpath.

## Hint 2
Deux règles de Spring Boot : un fichier `application.properties` situé **à côté** de l'application (`./config/`, `./`) l'emporte sur toute la configuration embarquée, documents de profil compris. Et une `@PropertySource` est ajoutée **après** tous les fichiers `application.*` : la moindre valeur de `application.yml` la masque.

## Hint 3
Vide `config/application.properties`. Remplace la `@PropertySource` par `spring.config.import: classpath:fees.properties` dans `application.yml` : le fichier importé l'emporte sur le document qui l'importe, et un document de profil l'emporte sur l'import. Retire l'ancien tarif « de secours » de `application.yml`.
