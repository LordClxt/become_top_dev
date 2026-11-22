## Hint 1
Six `@RequestParam` dans la signature, chacun avec ses règles : c'est lourd. Relis la leçon 2 : un paramètre d'un type à toi, **sans annotation**, est construit par Spring à partir des paramètres de la requête (`@ModelAttribute`). Et la leçon 3 : `@Valid` le fait valider d'un bloc.

## Hint 2
Les contraintes se posent sur les composants du record (`@Min`, `@Max`, `@Pattern`). Une règle qui porte sur **deux** champs (la période) peut s'écrire avec une méthode `@AssertTrue public boolean isPeriodValid()`. Un paramètre absent arrive à `null` : applique les valeurs par défaut dans le constructeur compact du record.

## Hint 3
Filtre, puis trie, puis compte le total, puis découpe la page (`skip(page * size).limit(size)`). Une date illisible est une erreur de liaison du même objet : elle arrive dans la même exception que les contraintes, sans code de plus.
