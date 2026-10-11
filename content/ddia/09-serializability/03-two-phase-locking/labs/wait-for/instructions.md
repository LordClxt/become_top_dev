Le gestionnaire de verrous d'une base en 2PL affiche cet état. **S** = verrou partagé (lecture), **X** = verrou exclusif (écriture).

| Transaction | Détient | Demande (en attente) |
|---|---|---|
| T1 | S sur `a` | X sur `b` |
| T2 | X sur `b` | X sur `c` |
| T3 | S sur `c` | X sur `a` |
| T4 | S sur `c` | S sur `d` |
| T5 | S sur `a`, X sur `d` | rien : elle s'exécute |

Dessine le **graphe d'attente** : une flèche **synchrone** de Ti vers Tj si Ti attend un verrou que Tj détient et qui est incompatible avec sa demande. Place les cinq transactions, même celles qui n'attendent personne.
