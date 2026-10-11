## Hint 1
Le fantôme vient de l'absence de lignes à verrouiller : il faut une table dont les lignes existent toujours, une par salle et par créneau.

## Hint 2
Le service écrit deux fois : verrou sur `room_slots` (`FOR UPDATE`), puis `INSERT` dans `bookings`. Les deux flèches sont des écritures.

## Hint 3
La vérification doit se faire dans la transaction : pas de cache, pas de contrôle côté navigateur. Et quelqu'un doit créer les créneaux d'avance.
