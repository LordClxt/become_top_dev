**Un failover, c'est trois gestes : détecter, choisir, reconfigurer.** Le détecteur surveille le leader par des messages de vie, et c'est lui qui met à jour le routeur : les clients suivent le nouveau leader sans rien changer. On promeut **B**, le plus avancé (LSN 10 980) : promouvoir C jetterait 1 110 changements de plus que nécessaire.

L'ancien leader ne doit plus jamais recevoir d'écriture : il revient **follower** du nouveau, et ses écritures non transmises sont jetées. Laisser deux leaders actifs, c'est le **split brain**. Chaque follower n'a qu'une source : le nouveau leader.
