## Contexte

Les classes sont déjà écrites dans `quotes.ts`, mais Nest ne les connaît pas : il manque les décorateurs et la déclaration dans le module. Ton travail est de les **câbler**, pas d'écrire de la logique.

## À faire

1. `QuotesService` doit être un provider injectable.
2. `QuotesController` répond sous le préfixe `/quotes` :
   - `GET /quotes` → la liste des citations (tableau JSON) ;
   - `GET /quotes/count` → `{ "count": <nombre> }`.
   Il **reçoit** le service par son constructeur. Il ne le crée pas.
3. `QuotesModule` déclare le contrôleur et le service, et **exporte** le service : un autre module (ici `StatsModule`, déjà écrit) doit pouvoir l'injecter.

Les tests vérifient aussi qu'il n'existe **qu'une seule** instance de `QuotesService` dans toute l'application.

## Contraintes

Aucun `new QuotesService()`. Ne modifie pas les données.
