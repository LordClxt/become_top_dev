## Contexte

Relay lit sa configuration depuis un fichier où chaque champ est facultatif, et traite de gros fichiers de journaux par morceaux. Deux problèmes de pointeurs et de slices : distinguer « pas renseigné » de « renseigné à zéro », et ne pas allouer de mémoire à chaque lecture.

## Ta mission

Dans `optional.go`, implémente quatre fonctions.

### `Merge(base, override Settings) Settings`
`Settings` a trois champs facultatifs (`Port *int`, `Debug *bool`, `Name *string`) : `nil` signifie « non renseigné ». Le résultat prend la valeur d'`override` quand elle est renseignée, sinon celle de `base` (qui peut elle-même être absente).

- Un pointeur vers `0`, `false` ou `""` est **renseigné** : `override.Port = &0` remplace bien le port de `base`.
- Le résultat ne doit partager **aucun pointeur** avec `base` ni `override` : copie les valeurs. Modifier `*merged.Port` ne doit modifier aucune des deux entrées.

### `Describe(s Settings) string`
`"port=8080 debug=unset name=api"` : les champs absents s'affichent `unset`, dans cet ordre.

### `ParseOptionalInt(s string) (*int, error)`
Une chaîne vide ou d'espaces donne `(nil, nil)` : l'absence n'est pas une erreur. Un entier valide (espaces autour tolérés) donne un pointeur vers sa valeur. Tout le reste : `(nil, erreur)`.

### `ReadChunks(r io.Reader, buf []byte, handle func(chunk []byte) error) error`
Lit `r` par morceaux dans le tampon `buf` et appelle `handle` avec `buf[:n]` pour chaque lecture non vide.

- Fin des données (`io.EOF`) : retourne `nil`.
- Erreur de `handle` : retourne-la immédiatement. Erreur de lecture : retourne-la, **après** avoir transmis les octets lus avec elle.
- `buf` vide : `ErrEmptyBuffer`.
- Aucune allocation dans la boucle : le tampon est alloué une fois (par l'appelant) et réutilisé.

## Contrainte

Un `Read` peut renvoyer des octets **et** une erreur dans le même appel. Traite d'abord les octets.
