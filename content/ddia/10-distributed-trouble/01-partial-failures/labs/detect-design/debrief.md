**Un silence ne prouve rien.** Requête perdue, en file, nœud figé, réponse perdue : l'émetteur voit la même chose. D'où la règle : on ne réessaie une action qu'avec une clé d'idempotence, sinon on risque de débiter deux fois.

**L'échelle rend les pannes permanentes** : avec 40 machines à 99,8 %, une requête sur treize environ (1 − 0,998⁴⁰ ≈ 7,7 %) rencontre une machine indisponible. Un service en ligne doit donc tolérer les pannes partielles, là où un calcul scientifique peut s'arrêter et repartir d'un point de reprise.

Enfin, quelques signaux explicites existent (refus de connexion, notification, ICMP), mais un nœud débranché se tait : le **timeout** reste le dernier recours, et il ne fait que soupçonner.
