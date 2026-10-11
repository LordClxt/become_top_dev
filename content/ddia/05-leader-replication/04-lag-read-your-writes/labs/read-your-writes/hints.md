## Hint 1
Le retard grossit de la différence entre ce que produit le leader et ce qu'applique le follower, chaque seconde.

## Hint 2
Seules les données que l'utilisateur a pu modifier lui-même doivent être lues au leader.

## Hint 3
Après la fenêtre, la lecture part sur un follower dont le retard est au plus `maxlag` : pour qu'il contienne l'écriture, il faut `maxlag ≤ fenêtre`.
