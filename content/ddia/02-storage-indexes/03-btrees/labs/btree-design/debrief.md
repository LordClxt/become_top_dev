**La hauteur ne grandit que quand la racine éclate.** Les feuilles éclatent d'abord (`[10 20 30 40]` → `[10 20]` + `[30 40]`, la clé `30` monte), puis leur parent déborde à son tour quand il reçoit une quatrième clé : à l'insertion de `100`, la page interne `[30 50 70 90]` éclate, `70` monte dans une **nouvelle racine**, et l'arbre passe de 2 à 3 niveaux.

Remarque tout de même ce que le B-tree garde invariant : toutes les feuilles sont à la **même profondeur**, et chaque page a au plus 3 clés. C'est ce qui garantit la profondeur en O(log n).
