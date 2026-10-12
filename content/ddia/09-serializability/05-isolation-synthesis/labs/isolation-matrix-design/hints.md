## Hint 1
Read committed : pas de lecture/écriture sale. Instantané : plus la lecture cohérente. Sérialisable : tout.

## Hint 2
Les fantômes de write skew n'ont rien à verrouiller.

## Hint 3
InnoDB : 2PL. PostgreSQL : SSI.
