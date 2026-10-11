**Chaque besoin a son mécanisme** : un consommateur CDC garde la recherche alignée sur PostgreSQL, une vue dérivée en parallèle permet de changer de forme sans interruption, le push amène les changements jusqu'au conducteur, et la fédération donne aux analystes une seule interface de requête.

Les chiffres disent où placer la frontière : 80 000 s de CPU par jour pour assembler à la lecture, 16 000 s pour précalculer, car on lit cinq fois plus qu'on n'écrit. Et la reconstruction complète de l'index ne prend que 100 minutes avec 8 consommateurs en parallèle : c'est ce qui rend l'index **jetable** et les migrations peu risquées.

Mais elle ne donne le même résultat que si la dérivation est **déterministe** : seulement les événements, dans l'ordre du log, idempotente par offset, et fenêtrée sur la date de l'événement. Enfin, rien de tout cela ne vaut la peine pour une filiale de 8 000 trajets : PostgreSQL seul y suffit.
