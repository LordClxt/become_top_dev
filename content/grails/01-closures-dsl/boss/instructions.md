## Contexte

`UrlMappings.groovy` de Grails déclare les routes d'une application dans une closure. Tu écris celui de Minigrails : un DSL où chaque ligne est un verbe HTTP (`get`, `post`, `put`, `delete`), un chemin et des options, avec des **groupes imbriqués** qui ajoutent un préfixe.

Fichier à éditer : `Router.groovy`. Trois méthodes : `build`, `match` et `path`. Tous les détails sont dans les commentaires du fichier.

## Ce qui rend le boss difficile

- Les verbes sont des noms libres : c'est un travail pour `methodMissing`.
- `group('/api') { … }` est une **méthode explicite** du builder, dont la closure doit s'exécuter avec un **nouveau builder** qui connaît le préfixe. Les groupes imbriqués cumulent les préfixes.
- Les routes sont testées **dans l'ordre de déclaration** : la première qui correspond gagne.
- `to:` mal formé → `IllegalArgumentException("route invalide : get /a")` (avec le chemin complet, préfixe compris).
- Un verbe inconnu (`patch`) doit rester une `MissingMethodException`, pas une route.

## Conseils

Sépare les responsabilités : le **builder** enregistre des routes (un `Map` par route), le **routeur** les interprète (`match`, `path`). Écris d'abord `match` sur des routes à la main, puis branche le DSL.
