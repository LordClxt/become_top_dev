## Hint 1
Commence par les deux zones et place le leader et son follower synchrone dans la région A ; les deux followers asynchrones en B.

## Hint 2
Le routeur est le seul à toucher la base : écritures vers le leader, lectures vers les followers de B.

## Hint 3
L'entrepôt se nourrit du log logique via la capture de changements ; le WAL physique et un second leader sont des intrus.
