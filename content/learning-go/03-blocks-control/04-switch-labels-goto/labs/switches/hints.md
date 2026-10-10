## Hint 1
`Grade` : traite d'abord le cas invalide, puis du plus grand seuil au plus petit. Dans un `switch` sans expression, le premier `case` vrai gagne, donc l'ordre compte.

## Hint 2
`Run` : place un label devant le `for` et utilise `break` + ce label dans le `case "stop"`. Un simple `break` ne sortirait que du `switch`. Les synonymes se regroupent : `case "up", "north":`.

## Hint 3
Pour `FirstAllPositiveRow`, un label sur la boucle des lignes et `continue label` dans la boucle des valeurs : si une valeur est ≤ 0, la ligne est rejetée. Si la boucle intérieure se termine, la ligne est valide : renvoie son indice. N'oublie pas de sauter les lignes vides. Pour `CountUntilNegative`, `break` avec le label de la boucle extérieure.
