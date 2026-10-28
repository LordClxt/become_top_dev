## Les tickets

> **#601** — L'équipe mobile : « Vos 401 n'ont pas le même format que les autres erreurs, notre parseur plante. »
>
> **#602** — Sécurité, **critique** : un libraire sans droits d'administration a supprimé un livre.
>
> **#603** — Le tableau de bord des erreurs est vide depuis des semaines, alors que le support reçoit des plaintes tous les jours.

L'application tient en quatre fichiers (`app.ts`, `auth.ts`, `timing.ts`, `errors.filter.ts`). Chaque brique, prise seule, semble correcte.

## Ta mission

Pour chaque ticket : reproduis, trouve la cause racine, corrige. Les trois causes sont différentes, et chacune tient à **la place** ou au **fonctionnement** d'une brique du pipeline.

Dans le débriefing, écris pour chaque ticket la règle du cycle de vie de la requête que le code ignorait.
