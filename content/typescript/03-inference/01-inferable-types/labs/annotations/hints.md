## Hint 1
Avec `: Promise<number>` sur getQuote, le `return cache.get(ticker)` est refusé : enveloppe-le dans `Promise.resolve(...)`, ou écris une fonction `async`.

## Hint 2
`const { id, name, price } = product;` puis un gabarit `${name} (#${id}) : ${price.toFixed(2)} €`.

## Hint 3
`/^\d+$/.test(input.trim())` reconnaît un entier positif ; `Number(...)` le convertit.
