**Un pipeline lisible est une suite de décisions simples.** Lire, parser, valider (rejets), tester la fraude (revue), aiguiller (B2B ou B2C), transformer, livrer. Chaque testeur a deux sorties, chaque consommateur est un point d'arrivée, et le testeur de fraude s'est inséré entre le validateur et l'aiguillage sans qu'aucun autre filtre ne change.

C'est la composition qui fait la force du style : demain, un testeur « commande urgente » s'insérera de la même façon. Le prix reste celui d'un monolithe : un seul quantum, une scalabilité limitée.
