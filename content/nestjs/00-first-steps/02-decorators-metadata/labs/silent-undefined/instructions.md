## Le ticket

> **#501** — La page « Nouveautés » affiche une erreur 500. L'application démarre pourtant sans aucun avertissement.
>
> Et une fois la page réparée en local par un stagiaire, elle reste **vide**, alors que les libraires ajoutent des livres toute la journée.

Le code est réparti dans cinq fichiers. Aucun ne lève d'erreur au démarrage.

## Ta mission

1. Reproduis : quelle requête, quelle erreur exacte ?
2. Trouve les **deux** causes racines. Elles touchent toutes les deux au conteneur d'injection.
3. Corrige-les sans changer le comportement des services.

Dans le débriefing, explique pour chaque cause pourquoi Nest n'a rien signalé au démarrage.
