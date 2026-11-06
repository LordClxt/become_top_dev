## Hint 1
`parse` : retire d'abord les séparateurs (espaces, points, tirets), puis traite le préfixe `+33`. Le résultat doit faire exactement 10 chiffres et commencer par 0.

## Hint 2
Pour l'affichage groupé, une boucle qui ajoute deux chiffres puis une espace, ou `String.format("%s %s %s %s %s", …)` sur des `substring`. Vérifie l'aller-retour : la sortie de `toString` doit être acceptée par `parse`.

## Hint 3
`String d = text.replaceAll("[ .\\-]", "")` ; si `d.startsWith("+33")`, `d = "0" + d.substring(3)` ; puis `d.matches("0\\d{9}")`. `Contact.toString` : `"Contact[nom=" + name + ", tél=" + phone + "]"`, sans le PIN.
