## Hint 1
`const rules = { email: (v) => …, … } satisfies Record<FieldName, Rule>;` : `v` est typé `unknown` grâce au contexte.

## Hint 2
Pour les erreurs, construis un `Partial<Record<FieldName, string>>` avec `Object.fromEntries` ou une boucle sur `FIELDS` ; la boucle sur un tuple `as const` donne des clés `FieldName`.

## Hint 3
Une fois toutes les règles passées, les valeurs sont sûres : `input.email as string` est justifié. `...(input.newsletter === true ? { newsletter: true } : {})`.
