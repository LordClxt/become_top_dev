**Sans ordre global, « la dernière écriture » n'existe pas.** Paris et Montréal voient les mêmes écritures dans un ordre différent ; les appliquer telles quelles fait diverger les réplicas pour toujours. Toute règle doit **converger**.

LWW converge, mais au prix de pertes silencieuses : 30 écritures acquittées jetées par jour, **900 par mois**, sans la moindre erreur. On le réserve aux données dont la perte est sans gravité. Ailleurs, on **évite** le conflit (un leader maison), on **fusionne** quand la sémantique le permet (union de tags), ou on **garde les versions** pour qu'un humain tranche — ce qui ne peut se faire qu'à la lecture.

Enfin, un conflit n'est pas toujours deux écritures sur la même ligne : deux réservations distinctes peuvent violer ensemble une règle métier. Et la topologie compte : un anneau se coupe à la première panne, l'all-to-all laisse des messages se doubler.
