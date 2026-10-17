## Hint 1
`tsTypeOf` récursif : `if (typeof column === 'object') { if ('enum' in column) … ; const inner = tsTypeOf(column.array); return inner.includes('|') ? \`(${inner})[]\` : \`${inner}[]\`; }`.

## Hint 2
`toPascalCase` : `name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')`.

## Hint 3
Construis un tableau de lignes et termine par `.join('\n')`.
