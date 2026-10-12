## Hint 1
Le LSN d'une entrée vaut `base + len(log) + 1`. Un follower garde son propre log : son LSN appliqué est `base + len(log)`.

## Hint 2
`Apply` a trois cas : LSN déjà vu (rien à faire, pas d'erreur), LSN suivant (on applique), LSN plus loin (`ErrGap`).

## Hint 3
`Promote` copie le log et les données du follower : la numérotation continue naturellement à `base + len(log) + 1`.

## Hint 4
Pour `Read`, il faut un follower dont le LSN est au moins `max(LastWrite, MinSeen)`. Lis le LSN et la valeur **en une seule opération** (`GetAt`) pour éviter qu'il change entre les deux.
