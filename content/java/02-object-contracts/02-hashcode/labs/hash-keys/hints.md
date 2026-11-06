## Hint 1
Si deux objets sont égaux, leurs hash doivent l'être : tout champ comparé dans `equals` doit entrer dans `hashCode`, et aucun autre.

## Hint 2
`Route` : `String.hashCode()` pour les codes d'aéroport, `LocalDate.hashCode()` pour la date. `Seats` : `Arrays.hashCode(boolean[])` existe.

## Hint 3
```
int result = origin.hashCode();
result = 31 * result + destination.hashCode();
result = 31 * result + date.hashCode();
```
Même schéma pour `Seats` avec `cabin.hashCode()` puis `Arrays.hashCode(free)`.
