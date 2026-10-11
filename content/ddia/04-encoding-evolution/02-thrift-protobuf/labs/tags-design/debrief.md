**Le numéro de champ est le contrat.** On peut renommer un champ (les octets ne contiennent pas son nom), ajouter un champ optionnel avec un numéro neuf (l'ancien code l'ignore en sautant les octets annotés) et retirer un champ optionnel à condition de ne jamais réutiliser son numéro. On ne change jamais un numéro, on n'ajoute pas de champ `required`, et on ne recycle pas un numéro.

Les entiers de longueur variable économisent des octets (−64 à 63 : 1 octet ; 1 337 : 2 octets). Et `repeated` laisse passer d'une valeur à plusieurs : l'ancien code ne voit que le dernier élément.
