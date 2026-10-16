## Contexte

En production, `GET /books/featured` répond 404 « Livre featured introuvable », et `GET /books/stats` ne renvoie pas les statistiques attendues. Tout est dans `app.ts`.

## À faire

1. **`createApp(module)`** crée l'application (`NestFactory.create`, `logger: false`, `abortOnError: false`) de sorte que :
   - l'**ordre de déclaration** des méthodes ne compte plus : les routes littérales passent avant les routes paramétrées ;
   - un **doublon** de route **fait échouer** le démarrage ;
   - une route **masquée** fait **aussi** échouer le démarrage.
2. Avec cette configuration, ton `AppModule` doit démarrer. Il contient un doublon : corrige-le **sans supprimer** la fonctionnalité d'administration. Les statistiques d'admin doivent être servies sous `GET /admin/stats`.

Ne réordonne pas les méthodes de `BooksController` : la configuration doit suffire.

## Ce que vérifient les tests

- `/books/featured`, `/books/stats` et `/books/<isbn>` répondent chacune par le bon handler ;
- `/admin/stats` répond ;
- un module de test qui déclare deux fois la même route fait échouer `app.init()` avec un message qui contient `Duplicate route`.
