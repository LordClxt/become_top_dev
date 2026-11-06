## Contexte

Un comparateur de vols met en cache le prix de chaque trajet dans une `HashMap<Route, Price>`. Deux bugs remontent :
- le cache ne trouve **jamais** un trajet déjà calculé ;
- la nuit, quand on précharge tous les vols au départ de Paris, le préchargement prend des minutes au lieu de secondes.

## 1. `Route`

`equals` est correct (origine, destination, date). Il manque `hashCode` : écris-le avec la recette `31 * result + c`, sur **les mêmes champs** qu'`equals`.

## 2. `Seats`

Un plan de cabine : un nom de cabine et un tableau `boolean[]` des sièges libres. Son `equals` utilise `Arrays.equals` sur le tableau ; son `hashCode` actuel ne regarde que la cabine. Il est légal… mais tous les plans d'une même cabine collisionnent. Corrige-le pour qu'il tienne compte de **tous** les champs significatifs.

## Contraintes

- Pas d'`Objects.hash` : ces clés sont hachées des millions de fois par jour.
- Les tests vérifient la cohérence avec `equals` **et** la répartition : sur des milliers de trajets au départ de la même ville, presque tous les hash doivent être distincts.
