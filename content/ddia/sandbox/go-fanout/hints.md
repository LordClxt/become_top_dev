## Hint 1
Écris une petite fonction `writeCost(s, followers, w)` qui renvoie le nombre d'écritures d'un tweet d'un compte à `followers` abonnés, selon la stratégie (1, `followers`, ou 1 pour une célébrité en `Hybrid`). `Estimate` et `MaxFanOut` s'en servent toutes les deux.

## Hint 2
`Estimate` : somme `writeCost` sur `w.Followers`, divise par la longueur (si elle n'est pas nulle), puis multiplie par `TweetsPerSec`. Les lectures ne dépendent que de la stratégie : `AvgFollowing`, 1, ou `1 + AvgCelebritiesFollowed`.

## Hint 3
`MaxFanOut` : un maximum sur les `writeCost` de chaque entrée de `Followers`, avec `max` (fonction prédéfinie depuis Go 1.21). Pour le seuil exclusif, une célébrité vérifie `followers > w.CelebrityThreshold`.
