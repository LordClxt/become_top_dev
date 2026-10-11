## Hint 1
Seules les demandes validées doivent entrer dans le log des requêtes : le client ne l'atteint qu'à travers le vérificateur de fonds.

## Hint 2
Le répartiteur ne touche jamais aux soldes : il publie deux instructions, une dans chaque partition de compte.

## Hint 3
Chaque partition de compte est lue par son propre processeur, qui est le seul à écrire dans les soldes de sa partition.
