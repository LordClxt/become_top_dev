## Contexte

Relay lance des jobs (« sauvegarde à 3 h », « rapport tous les lundis »). Il leur faut un planificateur. Tu écris le cœur, sur le modèle du format cron à cinq champs :

```
minute  heure  jour-du-mois  mois  jour-de-semaine
 0-59   0-23      1-31       1-12       0-6 (0 = dimanche)
```

## Jalon 1 : `ExpandField(field string, min, max int) ([]int, error)`

Développe un champ en la liste **triée et sans doublon** de ses valeurs.

| Forme | Sens | Exemple (min 0, max 59) |
|---|---|---|
| `*` | toutes les valeurs de `min` à `max` | `0…59` |
| `N` | une valeur | `7` → `[7]` |
| `A-B` | intervalle inclusif | `1-5` → `[1 2 3 4 5]` |
| `*/S` ou `A-B/S` | une valeur sur `S`, à partir du début | `*/15` → `[0 15 30 45]`, `10-20/5` → `[10 15 20]` |
| `a,b,c` | liste d'éléments de ces formes | `1,5,10-12` |

Un pas ne s'applique qu'à `*` ou à un intervalle (`1/5` est invalide). Avec `min = 1`, `*/10` donne `1, 11, 21, 31` : le pas part de `min`.

Deux erreurs sentinelles (testées avec `errors.Is`) :

- `ErrSyntax` : champ vide, élément vide (`1,,2`), nombre illisible, pas manquant ou **nul**, `1/5`, signe ou espace…
- `ErrRange` : valeur hors de `min`…`max`, intervalle inversé (`5-3`).

## Jalon 2 : `Parse` et `Matches`

- `Parse(spec string) (Schedule, error)` lit les cinq champs (séparés par un nombre quelconque d'espaces) avec les plages ci-dessus. Mauvais nombre de champs : `ErrSyntax`. Une erreur d'un champ est renvoyée en **conservant** sa sentinelle (enveloppe-la avec `%w`).
- `(Schedule).Matches(t time.Time) bool` : vrai si `t` correspond aux **cinq** champs. Les secondes sont ignorées. Jour du mois **et** jour de semaine doivent tous deux correspondre : `0 0 13 * 5` désigne « un vendredi 13 ».

## Jalon 3 : `(Schedule).Next(after time.Time) (time.Time, bool)`

Renvoie la première minute **strictement postérieure** à `after` qui correspond, avec les secondes à zéro et dans le fuseau de `after`. Renvoie `false` si rien ne correspond dans les cinq ans à venir (par exemple le 30 février).

Pense à ce que tu peux **sauter** quand un champ ne correspond pas : si le mois est mauvais, inutile de tester chaque minute du mois.

## Contraintes

- Pas de bibliothèque de planification.
- `Next` doit rester rapide même pour une planification qui ne correspond jamais.
