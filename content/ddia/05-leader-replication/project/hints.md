## Hint 1
Le LSN d'une entrée vaut `base + log.length + 1`. Un follower garde son propre log : son LSN appliqué est `base + log.length`.

## Hint 2
`apply` a trois cas : LSN déjà vu (rien à faire, pas d'erreur), LSN suivant (on applique), LSN plus loin (`GapError`).

## Hint 3
`promote` construit un `Leader` avec `new Leader({ base, log, data })` : le constructeur copie, et la numérotation continue naturellement à `base + log.length + 1`.

## Hint 4
Pour `read`, il faut un follower dont le LSN est au moins `Math.max(lastWrite, minSeen)`. Lis le LSN et la valeur **en une seule opération** (`getAt`) pour qu'ils correspondent.
