## Contexte

Le catalogue de Tixa doit être exposé en JSON : `GET /events` pour la liste, `GET /events/{id}` pour un événement. Un collègue a écrit le contrôleur, mais chaque appel répond **500**. Et pour un identifiant inconnu, il voulait un **404**, pas une réponse vide.

Les tests utilisent `@WebMvcTest` : une DispatcherServlet de test, ton contrôleur et le catalogue, sans serveur réel. Lance-les avec `jboot`.

## Ta mission

1. Fais répondre les deux routes en JSON.
2. `GET /events/{id}` pour un identifiant inconnu : statut 404, sans corps.

Une ou deux lignes suffisent. Ne modifie que `EventController.java`.
