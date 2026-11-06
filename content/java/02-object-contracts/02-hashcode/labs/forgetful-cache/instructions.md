## Le ticket

> **Équipe e-commerce — priorité haute.** « Depuis qu'on a ajouté le cache de prix, le calcul d'un panier n'est pas plus rapide : le tableau de bord affiche **0 % de succès** du cache. Et la mémoire du service augmente sans arrêt jusqu'au redémarrage. Les tests unitaires de `PriceCache` passent pourtant tous. »

Le code est dans `Sku.java`, `PriceKey.java`, `PriceCache.java` et `Checkout.java`. `Line` et `Pricing` sont fournis. Le calcul d'un prix (`Pricing.compute`) est lent : c'est pour ça qu'on le met en cache.

## Ta mission

1. **Reproduis** : calcule deux fois le même panier, puis regarde `hits()`, `misses()` et `size()`. Qu'attendais-tu ? Qu'obtiens-tu ?
2. **Trouve la cause racine.** Il y en a deux, dans deux fichiers différents, et chacune suffit à faire échouer le cache. Les tests unitaires existants passaient parce qu'ils réutilisaient **les mêmes objets** : pourquoi est-ce que ça masquait le problème ?
3. **Corrige** sans changer l'API publique.

Dans le débriefing, explique pour chaque cause pourquoi le compilateur et les tests existants ne l'ont pas vue.
