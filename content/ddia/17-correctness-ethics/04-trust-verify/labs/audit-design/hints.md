## Hint 1
Le service n'écrit que dans le log ; la base des soldes n'est alimentée que par le processeur de soldes.

## Hint 2
L'auditeur lit les deux extrémités : le log (pour recalculer) et la base des soldes (pour comparer). Il ne corrige rien lui-même : il alerte.

## Hint 3
Les sauvegardes ne valent que si quelqu'un les relit : un test de restauration doit les lire. Le log est haché dans un arbre de Merkle.
