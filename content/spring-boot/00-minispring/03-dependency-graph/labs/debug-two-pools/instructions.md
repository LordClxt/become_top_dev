## Contexte

Message de l'équipe exploitation :

> Tixa ne démarre plus en recette : « la base refuse une 2e connexion (pool déjà ouvert) ». La base n'accepte qu'un pool par application, et on n'en déclare qu'un : `ConnectionPool` est un singleton. Avant l'ajout de `HealthCheck` et de `Reports`, tout marchait. On a aussi branché un outil de supervision qui récupère les beans par leur type.

Le conteneur maison est réparti dans quatre fichiers : `MiniContainer.java` (définitions, cache, démarrage), `Resolver.java` (trouver les dépendances), `Factory.java` (créer un objet) et `Definitions.java` (lire une classe). Les tests rejouent le démarrage de Tixa et les demandes de la supervision.

## Ta mission

1. Trouve **pourquoi** le singleton est créé plusieurs fois. Il y a plus d'une cause.
2. Corrige-les.
3. Fais en sorte qu'il n'existe plus qu'**un seul chemin** vers la création d'un singleton, pour que le prochain raccourci ne réintroduise pas le bug.

Ne modifie pas les tests.
