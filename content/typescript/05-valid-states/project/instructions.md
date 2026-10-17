## Contexte

Jalon 5 de **Parse**. Ce chapitre portait sur des types qui n'expriment que des états valides. Un validateur doit produire de tels types : des **unions taguées** plutôt que des objets aux champs tous optionnels, un `null` **explicite**, des dates plutôt que des chaînes.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `nullable(inner)`

Accepte `null` en plus des valeurs de `inner` (mais pas `undefined`).

## Jalon 2 — `discriminatedUnion(tag, variants)`

`variants` associe chaque valeur du tag à la **forme** des autres champs. Le tag de l'entrée choisit la variante, puis seule sa forme est validée (les champs inconnus sont ignorés). Le type de sortie est une union d'objets, un par variante, avec le tag en littéral. Les types `Variant` et `TaggedUnion` sont fournis : à toi l'implémentation. Un tag absent ou inconnu (y compris une clé héritée comme `"toString"`) produit une erreur sur le chemin du tag (`$.kind`).

## Jalon 3 — `isoDate()`

Une chaîne `AAAA-MM-JJ` devient une `Date` UTC à minuit. Les dates impossibles (`2023-02-29`, `2024-13-01`) sont refusées.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
