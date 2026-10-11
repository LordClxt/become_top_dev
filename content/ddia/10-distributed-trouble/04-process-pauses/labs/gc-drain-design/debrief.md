**On ne supprime pas une pause de GC, on la rend invisible.** Le nœud prévient le répartiteur qu'il va collecter ; le répartiteur cesse de lui envoyer des requêtes, les requêtes en cours se terminent, la collecte tourne pendant que personne n'attend. Avec trois nœuds à 50 %, les deux restants passent à 75 % le temps de la collecte : il faut cette marge.

Le redémarrage roulant complète la technique : on ne laisse jamais les objets à longue vie s'accumuler au point d'exiger une collecte complète. On retire le nœud du trafic, on le relance, comme une mise à jour progressive.

Le swap et le chargement de code depuis un disque réseau sont deux autres sources de pauses longues et invisibles : un accès mémoire ou un premier appel de fonction qui attend une E/S.
