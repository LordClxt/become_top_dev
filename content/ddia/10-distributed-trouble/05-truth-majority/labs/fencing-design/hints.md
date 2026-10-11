## Hint 1
Le service de verrous ne doit pas tenir sur une seule machine : pose plusieurs nœuds dans sa zone et relie-les entre eux.

## Hint 2
Le stockage ne fait confiance à personne : il ne reçoit que des écritures de clients, chacune avec son jeton, et c'est lui qui compare.

## Hint 3
Trois nœuds de verrous en réplication, deux clients qui demandent un bail (flèche sync vers un nœud de verrous) et qui écrivent (flèche write) dans le stockage. Ni Redis unique ni horloge murale.
