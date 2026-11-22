## Contexte

L'écran de recherche de Tixa appelle `GET /events/search` avec des critères dans l'URL. Aujourd'hui, seule la ville est prise en compte, tout le catalogue revient d'un bloc, et rien n'est vérifié. Le front veut paginer, filtrer par période et trier ; l'équipe API veut que **toute** entrée invalide soit refusée avec un 400 en ProblemDetail qui nomme le champ (le conseil `ApiErrors`, fourni, ajoute la liste `errors` aux erreurs de validation).

## Ta mission

Paramètres, tous facultatifs :

| Paramètre | Défaut | Règle |
|---|---|---|
| `city` | toutes | égalité, sans tenir compte de la casse |
| `from`, `to` | aucune borne | dates ISO (`2026-07-09`), bornes **incluses** ; `from` ne peut pas être après `to` |
| `page` | 0 | ≥ 0 |
| `size` | 20 | entre 1 et 50 |
| `sort` | `date` | `date` (puis identifiant) ou `title` |

Réponse : `{"items": [...], "page": 0, "size": 20, "total": 12}`, où `total` compte **tous** les résultats, pas seulement la page.

Une entrée invalide, y compris une date illisible : **400** en `application/problem+json`, avec le champ dans `errors`.

Fichiers modifiables : `EventSearch.java` et `SearchController.java`. Le correcteur regarde aussi la clarté des messages d'erreur et la conception (voir le barème).
