## Hint 1
Pour compter avec `uniq -c`, les lignes identiques doivent être adjacentes. Et c'est le nombre de **clés distinctes** qui remplit la mémoire, pas la taille du fichier.

## Hint 2
Mémoire d'une table = nombre de clés distinctes × octets par entrée. 1 Mo = 10⁶ octets, 1 Go = 10⁹ octets.

## Hint 3
Le tri externe découpe le fichier en morceaux de la taille de la mémoire disponible : 500 Go / 8 Go par morceau, arrondi au supérieur.
