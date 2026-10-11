**Chaque décision de partitionnement rend une requête bon marché et une autre chère.** 30 To répliqués 3 fois font 90 To : 45 nœuds de 2 To au minimum. La clé `(vendeur, date)` regroupe les annonces d'un vendeur, mais la boutique d'une grande enseigne reste une clé brûlante : 45 000 / 8 000 = 5,6, donc 6 sous-clés.

Pour les index secondaires, l'index local garde les écritures simples mais paie le scatter/gather : avec 20 partitions lentes 1 % du temps, 1 − 0,99²⁰ ≈ 18,2 % des recherches sont lentes. L'index global inverse le compromis et accepte un léger retard.

Enfin, hash mod N fait déménager 90 % des données de 9 à 10 nœuds, contre 10 % avec des partitions fixes. ZooKeeper garde l'affectation faisant autorité, la couche de routage s'y abonne, et un humain valide les grands déplacements pour éviter une cascade.
