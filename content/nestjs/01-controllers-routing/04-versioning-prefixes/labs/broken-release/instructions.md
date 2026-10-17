## Les tickets

Trois tickets sont arrivés le lundi matin, après la mise en production de vendredi (« ajout du préfixe `/api` et du versioning ») :

> **#412** — La vitrine de la page d'accueil est vide. L'appli affiche « Livre featured introuvable ».
>
> **#413** — L'orchestrateur redémarre le conteneur toutes les 30 secondes : « health check failed on /api/health ».
>
> **#414** — L'appli mobile (typée) plante sur la pagination : le champ `page` de la réponse est la chaîne `"2"` au lieu du nombre `2`. Et un lien mal formé `?page=deux` renvoie 200 avec une liste vide au lieu d'une erreur.

L'application : `app.ts` (figé, c'est la configuration validée en équipe), `books.ts` et `health.ts`. Aucune erreur dans les logs.

## Ta mission

Pour chaque ticket : **reproduis** (quelle requête, quel résultat), trouve la **cause racine**, corrige. Les trois causes sont différentes.

Dans le débriefing, écris pour chaque ticket la cause en une phrase, et le réglage ou le test qui l'aurait détectée **avant** la production.
