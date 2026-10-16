## Contexte

Voici quatre petites fonctions écrites « à la JavaScript ». Dans un projet sans `noImplicitAny` ni `strictNullChecks`, elles passeraient. Sous `strict` (le réglage de cette plateforme), `tsc` les refuse, et chaque erreur correspond à un vrai bug en puissance : `add(10, null)`, `firstWord(null)`, `lastItem([])`…

Tu édites `helpers.ts`.

## À faire

- `add(a, b)` : deux nombres.
- `firstWord(text)` : premier mot du texte ; `''` si le texte est vide **ou `null`**.
- `lastItem(items)` : dernier élément d'une liste de chaînes, `undefined` si elle est vide. Le type de retour doit le dire.
- `StatusElement` : exporte l'interface `{ textContent: string | null }`. `setStatus(el, text)` écrit le texte dans l'élément s'il existe et renvoie `true` ; si `el` est `null` (comme un `getElementById` qui ne trouve rien), elle renvoie `false`.

## Contraintes

Pas de `any`, pas de `!`, pas de `as`. Les tests vérifient les signatures et refusent des appels comme `add(10, null)`.
