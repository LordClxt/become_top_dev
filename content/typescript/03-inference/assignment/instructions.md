## Contexte

Un formulaire d'inscription arrive sous forme de valeurs brutes (`Record<string, unknown>`). Tu écris sa validation en laissant l'inférence travailler : une liste de champs en `as const`, une table de règles vérifiée par `satisfies`, un résultat en **union taguée**, et un objet final construit d'un coup.

Tu édites `signup.ts`.

## À faire

1. `FIELDS` : `['email', 'password', 'age', 'newsletter']` en tuple de littéraux ; `FieldName` en est dérivé.
2. `rules` : une règle par champ, de type `Rule` (`(value: unknown) => string | null`, `null` = valide). Utilise `satisfies Record<FieldName, Rule>` : les callbacks reçoivent leurs types du contexte, et `keyof typeof rules` reste précis.
   - `email` : une chaîne contenant `@` → sinon `"e-mail invalide"` ;
   - `password` : une chaîne d'au moins 8 caractères → sinon `"8 caractères minimum"` ;
   - `age` : un entier entre 13 et 120 → sinon `"âge invalide"` ;
   - `newsletter` : absent ou booléen → sinon `"booléen attendu"`.
3. `validate(input)` renvoie `{ ok: true, value: Signup }` ou `{ ok: false, errors }` (un message par champ fautif, dans l'ordre de `FIELDS`). Annote le retour.
4. `Signup` : `newsletter` n'apparaît que s'il vaut `true` (décomposition conditionnelle) ; `email` est mis en minuscules.
5. `summary(result)` : `"inscrit : ada@example.com"` ou `"2 erreur(s) : email, age"`.

## Contraintes

Pas de `any`, pas d'assertion `as` ailleurs que pour relire une valeur déjà validée (commente-la).
