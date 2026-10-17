## Hint 1
#412 : regarde l'ordre des méthodes du contrôleur. #413 : calcule le chemin réel de la sonde à partir du préfixe et de la version par défaut. #414 : quel est le **type réel** de `page` à l'exécution ?

## Hint 2
#412 : la première route qui correspond gagne. #413 : une route peut échapper au versioning. #414 : l'annotation `page: number` et la valeur par défaut `= 1` ne convertissent rien ; `slice` accepte des chaînes par coercition, ce qui masque le problème jusqu'à ce que la valeur soit renvoyée telle quelle, ou vaille `NaN`.

## Hint 3
Déclare `featured` avant `:isbn` ; `@Controller({ path: 'health', version: VERSION_NEUTRAL })` ; `@Query('page', new DefaultValuePipe(1), ParseIntPipe)`.
