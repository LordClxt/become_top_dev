## Hint 1
Chaque système garde la dernière écriture qu'il reçoit ; la question est l'ordre d'arrivée. Pour la compaction, compte une entrée par clé distincte.

## Hint 2
Débit d'un groupe = min(partitions, consommateurs) × débit d'un consommateur. Pour la rétention : débit × secondes par jour × jours.

## Hint 3
Un snapshot n'a de sens qu'avec l'offset où il a été pris ; on bascule les lectures en dernier. Tâches lentes indépendantes : file classique ; base existante : CDC ; audit et recalcul : event sourcing.
