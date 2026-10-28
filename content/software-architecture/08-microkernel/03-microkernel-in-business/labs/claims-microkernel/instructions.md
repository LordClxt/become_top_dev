Dessine le traitement des sinistres en microkernel : l'interface appelle le **cœur**, qui consulte le **registre**, lit et écrit la **base des sinistres**, et appelle le plug-in de la juridiction. Chaque plug-in lit **ses propres règles**.

Le moteur de règles central est justement ce qu'on veut éviter.
