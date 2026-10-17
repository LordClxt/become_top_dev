## Hint 1
`const nums = [];` puis une boucle `for` qui fait `nums.push(i)`, et `return nums;`.

## Hint 2
Pour tokenize : `/^\d+$/.test(word) ? Number(word) : word` dans une boucle `for (const word of text.split(' '))`.

## Hint 3
`let result = null; try { const v: unknown = JSON.parse(text); if (typeof v === 'number') result = v; } catch { … }` — le `v: unknown` sert à éviter le `any` de JSON.parse.
