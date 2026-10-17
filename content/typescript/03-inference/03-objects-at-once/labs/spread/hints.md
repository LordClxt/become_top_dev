## Hint 1
`return { ...entity, id };`

## Hint 2
`...(options.sort ? { sort: options.sort } : {})` ; pour les tags, teste `options.tags && options.tags.length > 0`.

## Hint 3
Le nom complet : `[first, middle, last].filter(Boolean).join(' ')`.
