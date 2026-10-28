## À faire

Dans `app.ts` :

1. Écris le middleware fonctionnel `shopHeader` : il pose l'en-tête `x-shop: librairie`, puis passe la main.
2. Applique-le aux routes de `BooksController` **seulement** : `/health` ne doit pas recevoir l'en-tête.
