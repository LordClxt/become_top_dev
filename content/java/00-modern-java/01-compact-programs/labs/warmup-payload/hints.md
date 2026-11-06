## Hint 1
Un bloc de texte commence par `"""` suivi d'un saut de ligne, et finit par `"""`. Le contenu garde les guillemets tels quels.

## Hint 2
Le compilateur retire l'indentation commune à toutes les lignes, en comptant la ligne des `"""` fermants. Aligne le délimiteur fermant avec l'accolade ouvrante pour ne garder que les deux espaces voulus.

## Hint 3
Mets `%s` et `%d` à la place des valeurs, puis appelle `.formatted(user, unread)` sur le bloc. Les `"""` fermants seuls sur leur ligne produisent le saut de ligne final.
