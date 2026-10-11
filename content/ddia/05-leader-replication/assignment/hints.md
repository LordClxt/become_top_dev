## Hint 1
Arriéré = débit du leader × durée de la copie. Pendant le rattrapage, le follower ne gagne que la différence entre son débit et celui du leader.

## Hint 2
Le délai de détection doit dépasser les lenteurs « normales » (pics de latence, coupures brèves) sans laisser le système sans leader pendant des minutes.

## Hint 3
Pour qu'un follower serve une lecture sans casser read-your-writes ni les lectures monotones, sa position doit atteindre la plus haute des deux positions retenues pour l'utilisateur.
