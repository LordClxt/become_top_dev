Le service catalogue écrit aujourd'hui chaque modification de produit dans PostgreSQL, **puis** dans l'index de recherche, **puis** dans le cache. Des produits affichent un ancien prix dans la recherche depuis des semaines. Redessine l'architecture : une seule écriture par le code, une capture des changements qui lit le WAL, un log qui transporte les changements dans l'ordre vers tous les systèmes dérivés.

Conventions : écriture du code dans la base = `write` ; flux de changements = `async`.
