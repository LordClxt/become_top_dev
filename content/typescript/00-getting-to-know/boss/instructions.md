## Contexte

Un formulaire d'inscription envoie des données que tu ne contrôles pas : `age` arrive tantôt en nombre, tantôt en texte ; `newsletter` en booléen, en `"on"` ou pas du tout. Tu construis la **frontière** qui transforme cette entrée `unknown` en valeur sûre, en réutilisant tout le chapitre : types effacés, unions taguées, `null` géré, jamais de `any`.

Tu édites `signup.ts`. Le type `Result<T, E>` (union taguée sur `ok`) et `assertUnreachable` sont fournis.

## 1. `validateSignUp(raw: unknown): Result<SignUp, string>`

- `raw` doit être un objet (ni `null`, ni tableau) sinon `{ ok: false, errors: ['formulaire invalide'] }`.
- `email` : chaîne, `trim` + minuscules, de la forme `x@y.z`.
- `age` : entier entre 18 et 120, fourni comme nombre **ou** comme texte numérique (` 42 ` → `42` ; `''` et `' '` sont refusés).
- `newsletter` : optionnelle (`false` par défaut) ; accepte `true`/`false`, `'on'`/`'off'` (casse libre).
- Rapporte **toutes** les erreurs dans l'ordre email, âge, newsletter : `'email invalide'`, `'âge invalide'`, `'newsletter invalide'`.

## 2. `mapResult(result, f)`

Applique `f` à la valeur d'un succès ; un échec est renvoyé tel quel.

## 3. `unwrap(result)`

Renvoie la valeur d'un succès ; sur un échec, lève `Error` dont le message est les erreurs jointes par `'; '`. Termine le `switch` par `assertUnreachable`.

## Contraintes

Pas de `any`. Un `as Record<string, unknown>` après avoir vérifié que `raw` est un objet est toléré, pas d'autre assertion. Les tests de types refusent d'utiliser `result.value` avant d'avoir testé `ok`.
