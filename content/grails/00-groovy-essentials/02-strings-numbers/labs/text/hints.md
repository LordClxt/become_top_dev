## Hint 1
`slug` se fait en deux `replaceAll` : un pour remplacer les blocs interdits par `-` (`/[^a-z0-9]+/`), un pour retirer les `-` des extrémités (`/^-+|-+$/`). Les chaînes entre `/…/` évitent de doubler les antislashs.

## Hint 2
`text =~ /(\d+)\.(\d+)(?:\.(\d+))?/` renvoie un `Matcher`. Parcours-le avec `collect { m -> … }` : `m[0]` est le texte entier, `m[1]`, `m[2]`, `m[3]` sont les groupes. Un groupe absent vaut `null` : `(m[3] ?: 0)`.

## Hint 3
Pour la GString paresseuse : `"Hello ${-> ctx.name}"`. La flèche en fait une closure évaluée à chaque conversion en String. Pour `isHexColor`, `==~` exige que la regex couvre **toute** la chaîne, `=~` se contente d'en trouver un morceau.
