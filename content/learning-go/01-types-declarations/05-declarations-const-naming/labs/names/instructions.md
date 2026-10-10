## Contexte

Ton équipe veut un contrôle automatique des noms dans les revues de code. Tu écris le cœur du vérificateur : il sait dire si un nom est légal pour le compilateur Go, puis s'il respecte les conventions.

## Ta mission

Dans `names.go`, implémente :

### `IsValidIdentifier(name string) bool`
Vrai si `name` est un identifiant légal :

- il commence par une **lettre** (Unicode, donc `π` ou `é` passent) ou par `_` ;
- il continue avec des lettres, des chiffres (Unicode aussi) ou `_` ;
- ce n'est pas un des 25 mots-clés de Go (`for`, `func`, `var`, `range`…) ;
- il n'est pas vide.

### `Lint(name string) []string`
Renvoie la liste des écarts de style, dans cet ordre :

| Code | Quand |
|---|---|
| `Invalid` | le nom n'est pas un identifiant légal. C'est alors le **seul** code renvoyé. |
| `NonASCII` | le nom contient un caractère non ASCII (`ａ` pleine largeur, `π`, `é`…) |
| `SnakeCase` | le nom contient un `_` et au moins une minuscule (`index_counter`, `_tmp`) |
| `ScreamingCase` | le nom contient un `_` et aucune minuscule (`MAX_SIZE`) |

L'identifiant blanc `_` seul est toujours correct : il renvoie `nil`.
Un nom sans écart (`count`, `indexCounter`) renvoie `nil` ou une slice vide.

## Contrainte

Le paquet `unicode` de la bibliothèque standard connaît les lettres et les chiffres Unicode (`unicode.IsLetter`, `unicode.IsDigit`). Ne les réimplémente pas.
