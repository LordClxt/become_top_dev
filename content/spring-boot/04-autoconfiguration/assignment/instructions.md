## Contexte

Tixa active certaines fonctionnalités client par client : `tixa.features=loyalty, gift-cards`. L'équipe veut écrire `@ConditionalOnFeature("loyalty")` sur un bean, comme on écrit `@ConditionalOnProperty`. Et surtout, quand une fonctionnalité manque, la personne qui lit `--debug` doit comprendre **pourquoi** sans ouvrir le code.

L'annotation `@ConditionalOnFeature` est fournie ; elle pointe vers `OnFeatureCondition`, que tu écris.

## Ta tâche

1. `OnFeatureCondition` lit la valeur de l'annotation (le nom de la fonctionnalité) et la propriété `tixa.features`, une liste séparée par des virgules, espaces tolérés. La condition est vraie si la fonctionnalité y figure **exactement** (`gift-cards-v2` n'active pas `gift-cards`).
2. Sans `tixa.features`, aucune fonctionnalité n'est active.
3. L'issue (vraie ou fausse) apparaît dans le **rapport des conditions** de Spring Boot, avec un message qui nomme la fonctionnalité et la liste des fonctionnalités actives.

## Ce qui sera relu

La revue juge le message du rapport du point de vue de la personne de garde, et la façon de lire l'annotation.
