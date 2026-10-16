## Hint 1
Un schéma n'est qu'un objet avec trois fonctions. `parse` et `safeParse` ne diffèrent que par la façon de rapporter l'erreur : écris `run` une fois, et fais-en dériver les deux.

## Hint 2
Pour `object`, itère sur `Object.keys(shape)` ; pour chaque clé, appelle `shape[key].run(source[key], `${path}.${key}`)`. Comme `shape[key]` peut être `undefined` pour TypeScript, un `!` est ici justifié (la clé vient de `shape`).

## Hint 3
`safeParse` : `try { return { success: true, data: run(input, '$') } } catch (e) { if (e instanceof ParseError) return { success: false, error: e }; throw e }`. Relancer les autres erreurs évite d'avaler de vrais bugs.
