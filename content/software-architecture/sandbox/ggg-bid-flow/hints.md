## Hint 1
Quand deux services n'ont pas le même rythme, un appel direct fait attendre le plus rapide. Un bloc « File de messages » entre les deux absorbe l'écart.

## Hint 2
Il faut au moins trois files : une entre chaque service de capture et Bid Tracker, et une devant Payment.

## Hint 3
Bid Capture ne parle qu'à sa file. C'est Bid Tracker, et lui seul, qui écrit dans la base de données.
