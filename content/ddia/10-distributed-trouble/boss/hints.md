## Hint 1
Personne ne se proclame leader : le leader comme le remplaçant passent par le service de coordination, dont les nœuds vivent dans leur zone et se répliquent entre eux.

## Hint 2
Les battements de cœur vont du leader vers le détecteur, et l'alerte du détecteur vers le remplaçant : deux flèches asynchrones. Le stockage ne reçoit que des écritures accompagnées d'un jeton.

## Hint 3
Trois nœuds de coordination en réplication qui lisent l'heure auprès de deux serveurs NTP distincts, une supervision qui lit leur décalage, et aucun bloc parmi « verrou sur un seul nœud », « last write wins » et « swap ».
