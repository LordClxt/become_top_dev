## Hint 1
Jointure côté reduce : les deux entrées traversent le shuffle une fois. Broadcast : chaque tâche map lit **toute** la petite entrée.

## Hint 2
Charge du reducer le plus chargé ≈ part de la clé chaude répartie sur k reducers + part équitable du reste sur R reducers.

## Hint 3
Un workflow publie sa sortie en dernier, et seulement après avoir vérifié qu'elle est saine ; tout ce qui varie d'une exécution à l'autre empêche de rejouer.
