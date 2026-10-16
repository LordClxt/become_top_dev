## Hint 1
Un type de fonction se nomme comme n'importe quel alias : `type BinaryFn = (a: number, b: number) => number`. Ensuite, `const add: BinaryFn = (a, b) => a + b` : les paramètres sont déduits.

## Hint 2
Pour le wrapper, écris `export const checkedFetch: typeof fetch = async (input, init) => { … }` et regarde l'erreur : `Error` n'est pas assignable à `Response`.

## Hint 3
Remplace `return new Error(...)` par `throw new Error(...)`. `Parameters<typeof fetch>` donne le tuple des arguments, que tu peux étaler : `checkedFetch(...args)`.
