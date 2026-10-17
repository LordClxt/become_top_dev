## Hint 1
`transform` : `const value = inner.run(input, path); try { return fn(value); } catch (e) { … throw new ParseError(path, …) }`.

## Hint 2
`partition` : `inputs.map((input, i) => { try { return { ok: true as const, value: item.run(input, `$[${i}]`) }; } catch … })`, puis `flatMap` pour séparer. Les `as const` font des résultats une union taguée.

## Hint 3
Une méthode `async parseAsync(input) { … }` transforme toute exception en promesse rejetée.
