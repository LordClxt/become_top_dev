## Hint 1
Le pool ne perd une connexion que si quelqu'un l'emprunte sans la rendre. Cherche **tous les chemins** entre `acquire()` et `close()`, y compris ceux où une exception est levée… puis rattrapée.

## Hint 2
Deux symptômes, deux causes. La première ne se produit que quand une requête échoue (pense à qui avale l'exception). La seconde : que se passe-t-il quand `close()` est appelé **deux fois** sur le même emprunt ? Qui l'appelle deux fois ?

## Hint 3
Dans `Retry`, chaque tentative doit emprunter **et rendre** sa connexion : un `try (Connection c = pool.acquire())` par tour de boucle. Dans `Connection`, `close()` doit retenir qu'il a déjà été appelé et ne rendre la connexion physique qu'une fois ; une connexion fermée refuse ensuite `query`. Le `c.close()` explicite d'`OrderRepository.count` devient alors inoffensif (tu peux aussi le retirer).
