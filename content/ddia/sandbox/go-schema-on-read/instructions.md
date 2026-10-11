## Contexte

Ton application stocke des utilisateurs dans une base de documents. Au début, un seul champ `name` ; depuis la v2, `first_name` et `last_name`. La base ne vérifie rien (schema-on-read) : c'est ton **code de lecture** qui doit comprendre toutes les versions. Tu écris aussi la migration « eager » qui réécrit les vieux documents.

## À implémenter dans `reader.go`

### `ReadUser(doc map[string]any) (User, error)`
- Si `first_name` existe : prénom = `first_name`, nom = `last_name` (vide s'il manque). Il **l'emporte** même si `name` est aussi présent.
- Sinon `name` (v1) : retire les espaces autour, coupe au **premier** espace. `"Ludwig van Beethoven"` → `Ludwig` / `van Beethoven`. Un seul mot : nom de famille vide.
- Ni l'un ni l'autre, ou `name` vide : `ErrNoName`. Un champ de nom qui n'est pas une chaîne : `ErrBadType`.

### `Migrate(docs)`
Réécrit les documents v1 **en place** : ajoute `first_name` et `last_name`, supprime `name`, garde les autres champs. Renvoie le nombre de documents modifiés. Idempotente. Elle s'arrête au premier document illisible et renvoie son erreur avec le nombre déjà migré.

## Pour réfléchir

Quand préfères-tu migrer à la lecture (lazy) plutôt qu'avec un `UPDATE` global ?
