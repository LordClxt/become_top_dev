## Hint 1
Dans un module, `declare global { var currentUser: User | undefined; }` ; puis `globalThis.currentUser = user;`. (`var` est obligatoire ici : seules les déclarations `var` deviennent des propriétés de `globalThis`.)

## Hint 2
`const tooltips = new WeakMap<object, string>();`

## Hint 3
`targets.filter((t) => tooltips.has(t)).length`.
