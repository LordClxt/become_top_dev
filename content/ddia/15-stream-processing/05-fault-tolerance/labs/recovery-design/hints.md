## Hint 1
Au redémarrage, le consommateur repart de l'offset **validé**, pas du dernier message appliqué en base : tout ce qui est entre les deux est relu.

## Hint 2
Avec la déduplication, un message dont l'offset est inférieur ou égal à l'offset stocké dans la ligne est ignoré.

## Hint 3
Pour le réglage : messages à rejouer = intervalle × débit ; débit d'écriture des checkpoints = taille de l'état / intervalle. Les deux contraintes tirent en sens inverse.
