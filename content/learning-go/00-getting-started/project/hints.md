## Hint 1
Pour Parse, regarde le **premier caractère** de la ligne brute avant de la nettoyer : tabulation, espace ou autre. Garde en mémoire le nom de la cible courante pour savoir à qui rattacher une commande.

## Hint 2
`strings.Cut(line, ":")` sépare le nom de la cible de ses dépendances, et `strings.Fields` découpe les dépendances quel que soit le nombre d'espaces. Pour Plan, un parcours en profondeur : visiter d'abord chaque dépendance, puis ajouter la cible à la liste si elle n'y est pas déjà.

## Hint 3
Pour détecter un cycle, passe à la fonction récursive le chemin en cours (`[]string`) : si la cible y est déjà, c'est une boucle. Une cible déjà dans le résultat final, en revanche, est simplement ignorée. Run se contente d'appeler Plan puis de boucler sur les commandes de chaque cible.
